import ExcelJS from 'exceljs';
import { Submission } from '@/lib/models/Submission';

export async function buildExcel(jobId: string, header: { companyName: string; jobName: string; city: string }) {
  // 1. Fetch submissions AND populate the painter's name for our tab titles
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('painterId', 'name')
    .lean();

  const wb = new ExcelJS.Workbook();
  const flattenedRows: any[] = [];

  // ---- HELPER FUNCTION: Builds a standard worksheet ----
  const createSheet = (sheetName: string, dataGroups: any[]) => {
    // Sanitize sheet name
    const safeName = sheetName.replace(/[\\/?*\[\]]/g, '').substring(0, 31) || 'Unknown Painter';
    const ws = wb.addWorksheet(safeName, { views: [{ state: 'frozen', ySplit: 3 }] });

    let grandTotal = 0; // Track the total square footage for this specific sheet

    // Header Row
    ws.mergeCells('A1:G1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${header.companyName}`.toUpperCase();
    titleCell.font  = { bold: true, size: 13, underline: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    // Column Headers (Updated to match your requested format)
    ws.getRow(3).values = ['S.NO.', 'PHOTO NO.', 'LOCATION', 'SIZE', '', '', 'TOTAL'];
    ws.mergeCells('D3:F3'); // Merge the SIZE header over the L, x, B columns
    ws.getRow(3).font = { bold: true, underline: true };
    ws.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
    
    ws.columns = [
      { key: 'sno',      width: 8  },
      { key: 'photoNo',  width: 12 },
      { key: 'location', width: 42 },
      { key: 'l',        width: 6  },
      { key: 'x',        width: 4  },
      { key: 'b',        width: 6  },
      { key: 'total',    width: 12 },
    ];

    // Data Rows
    let sno = 1;
    for (const sub of dataGroups) {
      for (const [L, B] of sub.sizes) {
        const rowTotal = L * B;
        grandTotal += rowTotal; // Add to our running sheet total

        const rowData = {
          sno     : sno++,
          photoNo : sub.photoNo,
          location: sub.location,
          l       : L,
          x       : '×',
          b       : B,
          total   : rowTotal,
          painterId: sub.painterId._id ? sub.painterId._id.toString() : sub.painterId.toString(),
          painterName: sub.painterId.name || 'Unknown',
        };

        ws.addRow(rowData);
        
        if (sheetName === 'Master List') {
          flattenedRows.push(rowData);
        }
      }
    }

    // Borders & Center Alignment
    const lastDataRow = ws.lastRow?.number || 3;
    if (lastDataRow >= 3) {
      for (let r = 3; r <= lastDataRow; r++) {
        for (let c = 1; c <= 7; c++) {
          const cell = ws.getCell(r, c);
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          };
          // Center align ALL columns!
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
    }

    // Append the Total Row at the bottom
    ws.addRow([]); // Blank spacer
    ws.addRow([]); // Blank spacer
    
    const summaryRow = ws.addRow(['', '', 'TOTAL SQ. FT. =', '', '', '', grandTotal]);
    const summaryRowNum = summaryRow.number;
    
    // Merge the text across columns C, D, E, and F so it sits right next to the total
    ws.mergeCells(`C${summaryRowNum}:F${summaryRowNum}`);
    
    const labelCell = ws.getCell(`C${summaryRowNum}`);
    labelCell.value = 'TOTAL SQ. FT. =';
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' }; // Push text to the right
    labelCell.font = { bold: true };

    const valueCell = ws.getCell(`G${summaryRowNum}`);
    valueCell.value = grandTotal;
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valueCell.font = { bold: true };
  };

  // 2. CREATE TAB 1: The Master List (All Submissions)
  createSheet('Master List', subs);

  // 3. CREATE INDIVIDUAL TABS: Group by Painter
  const painterGroups = new Map<string, any[]>();
  
  for (const sub of subs) {
    const pName = (sub.painterId as any).name || 'Unknown';
    const group = painterGroups.get(pName) || [];
    group.push(sub);
    painterGroups.set(pName, group);
  }

  for (const [painterName, painterSubs] of painterGroups.entries()) {
    createSheet(painterName, painterSubs);
  }

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    rows: flattenedRows
  };
}
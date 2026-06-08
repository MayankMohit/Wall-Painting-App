import ExcelJS from 'exceljs';

export function buildMasterSheet(
  wb: ExcelJS.Workbook, 
  header: { companyName: string; jobName: string }, 
  dataGroups: any[]
) {
  const ws = wb.addWorksheet('Master List'); 
  const flattenedRows: any[] = [];
  let grandTotal = 0; 

  // 1. Header Row (Job Name)
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${header.jobName}`.toUpperCase();
  titleCell.font  = { bold: true, size: 13, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  ws.getRow(1).height = 18; 

  // Column Headers (Row 3)
  ws.getRow(3).values = ['S.NO.', 'PHOTO NO.', 'LOCATION', 'SIZE', '', '', 'TOTAL'];
  ws.mergeCells('D3:F3'); 
  ws.getRow(3).font = { bold: true, underline: true };
  ws.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
  
  ws.columns = [
    { key: 'sno',      width: 6 },
    { key: 'photoNo',  width: 10.5 },
    { key: 'location', width: 49 },
    { key: 'l',        width: 5  },
    { key: 'x',        width: 3  },
    { key: 'b',        width: 5  },
    { key: 'total',    width: 11.5 },
  ];

  // Insert the blank line (Row 4)
  ws.addRow([]); 

  // Data Rows (Starts at Row 5)
  let sno = 1;
  for (const sub of dataGroups) {
    for (const [L, B] of sub.sizes) {
      const rowTotal = L * B;
      grandTotal += rowTotal; 

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
      flattenedRows.push(rowData);
    }
  }

  // Borders & Center Alignment (Now includes Row 4)
  const lastDataRow = ws.lastRow?.number || 4;

  const applyBordersAndCenter = (r: number, c: number) => {
    const cell = ws.getCell(r, c);
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  // Apply formatting continuously from Row 3 down to the last data row
  if (lastDataRow >= 3) {
    for (let r = 3; r <= lastDataRow; r++) {
      for (let c = 1; c <= 7; c++) {
        applyBordersAndCenter(r, c);
      }
    }
  }

  // Append the Total Row at the bottom with exactly 1 line of spacing
  ws.addRow([]); 
  
  const summaryRow = ws.addRow(['', '', 'TOTAL SQ. FT. =', '', '', '', grandTotal]);
  const summaryRowNum = summaryRow.number;
  
  ws.mergeCells(`C${summaryRowNum}:F${summaryRowNum}`);
  
  const labelCell = ws.getCell(`C${summaryRowNum}`);
  labelCell.value = 'TOTAL SQ. FT. =';
  labelCell.alignment = { horizontal: 'right', vertical: 'middle' }; 
  labelCell.font = { bold: true };

  const valueCell = ws.getCell(`G${summaryRowNum}`);
  valueCell.value = grandTotal;
  valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
  valueCell.font = { bold: true };

  return flattenedRows;
}
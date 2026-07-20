import ExcelJS from 'exceljs';
import { getColumns, applyBordersAndCenter, buildHeaderRow, buildTotalRow, sanitizeCell } from './excelHelpers';

export function buildMasterSheet(
  wb: ExcelJS.Workbook, 
  header: { companyName: string; jobName: string }, 
  dataGroups: any[],
  pdfFormat?: string,
  jobType?: string
) {
  const ws = wb.addWorksheet('Master List'); 
  const flattenedRows: any[] = [];
  let grandTotal = 0; 
  
  const isFormatB = pdfFormat === 'B';
  const isVan = jobType === 'Van';
  const numCols = isFormatB && isVan ? 6 : 7;

  // Set Page Layout (Portrait vs Landscape)
  ws.pageSetup = {
    orientation: (isFormatB && isVan) ? 'landscape' : 'portrait',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // 1. Header
  ws.mergeCells(`A1:${isFormatB && isVan ? 'F1' : 'G1'}`);
  const titleCell = ws.getCell('A1');
  titleCell.value = sanitizeCell(`${header.jobName}`.toUpperCase());
  titleCell.font  = { bold: true, size: 13, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 18; 

  ws.columns = getColumns(isFormatB, isVan);
  buildHeaderRow(ws, 3, isFormatB, isVan);
  ws.addRow([]); // Blank row 4

  // 2. Data Rows
  let sno = 1;
  for (const sub of dataGroups) {
    const locText = isFormatB && sub.shopName ? `${sub.shopName} - ${sub.location}` : sub.location;
    const painterId = sub.painterId?._id ? sub.painterId._id.toString() : (sub.painterId?.toString() || 'unknown');
    const painterName = sub.painterId?.name || 'Unknown painter';

    if (isFormatB && isVan) {
      const rowData = {
        sno         : sno++,
        photoNo     : sub.photoNo,
        location    : sanitizeCell(locText),
        vanNo       : sanitizeCell(sub.vanNo || '—'),
        contactNo   : sanitizeCell(sub.contactNo || '—'),
        position    : sanitizeCell(sub.aboveBelow || '—'),
        painterId,
        painterName
      };
      ws.addRow(rowData);
      flattenedRows.push(rowData);
    } else {
      for (const [L, B] of (sub.ownerSizes?.length ? sub.ownerSizes : sub.sizes)) {
        const rowTotal = L * B;
        grandTotal += rowTotal; 

        const rowData = {
          sno         : sno++,
          photoNo     : sub.photoNo,
          location    : sanitizeCell(locText),
          l           : L,
          x           : '×',
          b           : B,
          total       : rowTotal,
          painterId,
          painterName
        };
        ws.addRow(rowData);
        flattenedRows.push(rowData);
      }
    }
  }

  // 3. Borders
  const lastDataRow = ws.lastRow?.number || 4;
  if (lastDataRow >= 3) {
    for (let r = 3; r <= lastDataRow; r++) {
      for (let c = 1; c <= numCols; c++) {
        applyBordersAndCenter(ws, r, c);
      }
    }
  }

  // 4. Footer (Skipped entirely for Van)
  if (!(isFormatB && isVan)) {
    buildTotalRow(ws, grandTotal);
  }

  return flattenedRows;
}
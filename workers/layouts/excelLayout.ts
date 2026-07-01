import ExcelJS from 'exceljs';
import { SHARED_COLUMNS, applyBordersAndCenter, buildHeaderRow, buildTotalRow, sanitizeCell } from './excelHelpers';

export function buildMasterSheet(
  wb: ExcelJS.Workbook, 
  header: { companyName: string; jobName: string }, 
  dataGroups: any[]
) {
  const ws = wb.addWorksheet('Master List'); 
  const flattenedRows: any[] = [];
  let grandTotal = 0; 

  // 1. Header
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = sanitizeCell(`${header.jobName}`.toUpperCase());
  titleCell.font  = { bold: true, size: 13, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 18; 

  ws.columns = SHARED_COLUMNS;
  buildHeaderRow(ws, 3);
  ws.addRow([]); // Blank row 4

  // 2. Data Rows
  let sno = 1;
  for (const sub of dataGroups) {
    for (const [L, B] of sub.sizes) {
      const rowTotal = L * B;
      grandTotal += rowTotal; 

      const rowData = {
        sno     : sno++,
        photoNo : sub.photoNo,
        location: sanitizeCell(sub.location),
        l       : L,
        x       : '×',
        b       : B,
        total   : rowTotal,
        painterId: sub.painterId?._id ? sub.painterId._id.toString() : (sub.painterId?.toString() || 'unknown'),
        painterName: sub.painterId?.name || 'Unknown painter', // Guarded against deleted painters
      };

      ws.addRow(rowData);
      flattenedRows.push(rowData);
    }
  }

  // 3. Borders
  const lastDataRow = ws.lastRow?.number || 4;
  if (lastDataRow >= 3) {
    for (let r = 3; r <= lastDataRow; r++) {
      for (let c = 1; c <= 7; c++) {
        applyBordersAndCenter(ws, r, c);
      }
    }
  }

  // 4. Footer
  buildTotalRow(ws, grandTotal);

  return flattenedRows;
}
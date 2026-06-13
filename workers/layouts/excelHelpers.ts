import ExcelJS from 'exceljs';

export const SHARED_COLUMNS = [
  { key: 'sno',      width: 6 },
  { key: 'photoNo',  width: 10.5 },
  { key: 'location', width: 49 },
  { key: 'l',        width: 5  },
  { key: 'x',        width: 3  },
  { key: 'b',        width: 5  },
  { key: 'total',    width: 11.5 },
];

export function applyBordersAndCenter(ws: ExcelJS.Worksheet, r: number, c: number) {
  const cell = ws.getCell(r, c);
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
  cell.alignment = { 
    horizontal: 'center',
    vertical: 'middle',
    wrapText: c === 3
  };
}

export function buildHeaderRow(ws: ExcelJS.Worksheet, rowNum: number) {
  const headerRow = ws.getRow(rowNum);
  headerRow.values = ['S.NO.', 'PHOTO NO.', 'LOCATION', 'SIZE', '', '', 'TOTAL'];
  ws.mergeCells(`D${rowNum}:F${rowNum}`); 
  headerRow.font = { bold: true, underline: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
}

// CHANGED: Restored the perfect right-aligned merge for all totals!
export function buildTotalRow(ws: ExcelJS.Worksheet, total: number, label: string = 'TOTAL SQ. FT. =') {
  ws.addRow([]); // This single line creates your perfect 1-row gap!
  const summaryRow = ws.addRow(['', '', label, '', '', '', total]);
  const rowNum = summaryRow.number;
  
  // Merge C through F and push text to the right edge
  ws.mergeCells(`C${rowNum}:F${rowNum}`);
  const labelCell = ws.getCell(`C${rowNum}`);
  labelCell.value = label;
  labelCell.alignment = { horizontal: 'right', vertical: 'middle' }; 
  labelCell.font = { bold: true };

  const valueCell = ws.getCell(`G${rowNum}`);
  valueCell.value = total;
  valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
  valueCell.font = { bold: true };
}
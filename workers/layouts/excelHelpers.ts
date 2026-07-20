import ExcelJS from 'exceljs';

// Excel/CSV formula-injection guard.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
export function sanitizeCell<T>(value: T): T | string {
  return typeof value === 'string' && FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

export function getColumns(isFormatB: boolean, isVan: boolean) {
  if (isFormatB && isVan) {
    // Landscape sizing (approx 132 total width)
    return [
      { key: 'sno',       width: 8 },
      { key: 'photoNo',   width: 14 },
      { key: 'location',  width: 58 },
      { key: 'vanNo',     width: 18 },
      { key: 'contactNo', width: 18 },
      { key: 'position',  width: 16 },
    ];
  }
  // Standard Portrait sizing (approx 90 total width)
  return [
    { key: 'sno',       width: 6 },
    { key: 'photoNo',   width: 10.5 },
    { key: 'location',  width: 49 },
    { key: 'l',         width: 5  },
    { key: 'x',         width: 3  },
    { key: 'b',         width: 5  },
    { key: 'total',     width: 11.5 },
  ];
}

export function applyBordersAndCenter(ws: ExcelJS.Worksheet, r: number, c: number) {
  const cell = ws.getCell(r, c);
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
  cell.alignment = { 
    horizontal: 'center',
    vertical: 'middle',
    wrapText: c === 3 // Location column wraps in both formats
  };
}

export function buildHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, isFormatB: boolean, isVan: boolean) {
  const headerRow = ws.getRow(rowNum);
  if (isFormatB && isVan) {
    headerRow.values = ['S.NO.', 'PHOTO NO.', 'LOCATION', 'VAN NO.', 'CONTACT NO.', 'POSITION'];
  } else {
    headerRow.values = ['S.NO.', 'PHOTO NO.', 'LOCATION', 'SIZE', '', '', 'TOTAL'];
    ws.mergeCells(`D${rowNum}:F${rowNum}`); 
  }
  headerRow.font = { bold: true, underline: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
}

export function buildTotalRow(ws: ExcelJS.Worksheet, total: number, label: string = 'TOTAL SQ. FT. =') {
  ws.addRow([]); // Gap row
  const summaryRow = ws.addRow(['', '', label, '', '', '', total]);
  const rowNum = summaryRow.number;
  
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
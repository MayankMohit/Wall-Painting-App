import ExcelJS from 'exceljs';
import { getColumns, applyBordersAndCenter, buildHeaderRow, buildTotalRow, sanitizeCell } from './excelHelpers';

export function buildPainterSections(
  wb: ExcelJS.Workbook,
  header: { companyName: string; jobName: string },
  dataGroups: any[],
  allPainters: { _id: string; name: string }[],
  pdfFormat?: string,
  jobType?: string
) {
  const ws = wb.addWorksheet('Painter Wise');
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

  // 1. Header Row
  ws.mergeCells(`A1:${isFormatB && isVan ? 'F1' : 'G1'}`);
  const titleCell = ws.getCell('A1');
  titleCell.value = sanitizeCell(`${header.jobName}`.toUpperCase());
  titleCell.font = { bold: true, size: 13, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 18;
  ws.columns = getColumns(isFormatB, isVan);

  // 2. Group data by painter
  const stats = new Map<string, { name: string; walls: number; total: number; rows: any[] }>();
  for (const p of allPainters) {
    stats.set(p._id.toString(), { name: p.name, walls: 0, total: 0, rows: [] });
  }

  for (const sub of dataGroups) {
    const pId = sub.painterId?._id ? sub.painterId._id.toString() : (sub.painterId?.toString() || 'unknown');
    const pName = sub.painterId?.name || 'Unknown painter';
    const locText = isFormatB && sub.shopName ? `${sub.shopName} - ${sub.location}` : sub.location;

    if (!stats.has(pId)) stats.set(pId, { name: pName, walls: 0, total: 0, rows: [] });
    const stat = stats.get(pId)!;
    
    if (isFormatB && isVan) {
      stat.walls += 1; // Treating walls as 'Units'
      stat.rows.push({
        photoNo: sub.photoNo,
        location: sanitizeCell(locText),
        vanNo: sanitizeCell(sub.vanNo || '—'),
        contactNo: sanitizeCell(sub.contactNo || '—'),
        position: sanitizeCell(sub.aboveBelow || '—')
      });
    } else {
      for (const [L, B] of sub.sizes) {
        const rowTotal = L * B;
        stat.walls += 1;
        stat.total += rowTotal;
        grandTotal += rowTotal;
        stat.rows.push({ photoNo: sub.photoNo, location: sanitizeCell(locText), l: L, x: '×', b: B, total: rowTotal });
      }
    }
  }

  const sortedPainters = Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Summary Block
  ws.addRow([]); 
  if (isFormatB && isVan) {
    const summaryHeader = ws.addRow(['S.NO.', '', 'PAINTER', 'UNITS', '', '']);
    const shr = summaryHeader.number;
    ws.mergeCells(`A${shr}:B${shr}`);
    ws.mergeCells(`D${shr}:F${shr}`);
    summaryHeader.font = { bold: true };
    summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 6; c++) applyBordersAndCenter(ws, shr, c);

    let summarySno = 1; 
    for (const p of sortedPainters) {
      const r = ws.addRow([summarySno++, '', sanitizeCell(p.name), p.walls, '', '']);
      const rn = r.number;
      ws.mergeCells(`A${rn}:B${rn}`); 
      ws.mergeCells(`D${rn}:F${rn}`); 
      r.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 6; c++) applyBordersAndCenter(ws, rn, c);
    }
  } else {
    const summaryHeader = ws.addRow(['S.NO.', '', 'PAINTER', 'WALLS', '', 'TOTAL SQ. FT.', '']);
    const shr = summaryHeader.number;
    ws.mergeCells(`A${shr}:B${shr}`); 
    ws.mergeCells(`D${shr}:E${shr}`); 
    ws.mergeCells(`F${shr}:G${shr}`); 
    summaryHeader.font = { bold: true };
    summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 7; c++) applyBordersAndCenter(ws, shr, c);

    let summarySno = 1; 
    for (const p of sortedPainters) {
      const r = ws.addRow([summarySno++, '', sanitizeCell(p.name), p.walls, '', p.total, '']);
      const rn = r.number;
      ws.mergeCells(`A${rn}:B${rn}`); 
      ws.mergeCells(`D${rn}:E${rn}`); 
      ws.mergeCells(`F${rn}:G${rn}`);
      r.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 7; c++) applyBordersAndCenter(ws, rn, c);
    }
  }

  // 4. Detailed Sections
  for (const p of sortedPainters) {
    if (p.rows.length === 0) continue; 

    ws.addRow([]); ws.addRow([]); 
    
    const pHeader = ws.addRow([sanitizeCell(p.name.toUpperCase())]);
    const phr = pHeader.number;
    ws.mergeCells(`A${phr}:${isFormatB && isVan ? 'F' : 'G'}${phr}`);
    pHeader.font = { bold: true };
    pHeader.alignment = { horizontal: 'center', vertical: 'middle' }; 
    ws.getCell(`A${phr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    
    buildHeaderRow(ws, ws.addRow([]).number, isFormatB, isVan);
    const startDataRow = ws.lastRow!.number + 1;

    let sno = 1;
    for (const rData of p.rows) {
      ws.addRow({ sno: sno++, ...rData });
    }

    const endDataRow = ws.lastRow!.number;
    for (let r = startDataRow - 1; r <= endDataRow; r++) {
      for (let c = 1; c <= numCols; c++) applyBordersAndCenter(ws, r, c);
    }

    if (!(isFormatB && isVan)) {
      buildTotalRow(ws, p.total, 'TOTAL SQ. FT. =');
    }
  }

  // 5. Job Grand Total
  if (!(isFormatB && isVan)) {
    buildTotalRow(ws, grandTotal, 'GRAND TOTAL SQ. FT. =');
  }
}
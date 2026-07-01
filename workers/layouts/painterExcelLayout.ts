import ExcelJS from 'exceljs';
import { SHARED_COLUMNS, applyBordersAndCenter, buildHeaderRow, buildTotalRow, sanitizeCell } from './excelHelpers';

export function buildPainterSections(
  wb: ExcelJS.Workbook,
  header: { companyName: string; jobName: string },
  dataGroups: any[],
  allPainters: { _id: string; name: string }[]
) {
  const ws = wb.addWorksheet('Painter Wise');
  let grandTotal = 0;

  // 1. Header Row
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = sanitizeCell(`${header.jobName}`.toUpperCase());
  titleCell.font = { bold: true, size: 13, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 18;
  ws.columns = SHARED_COLUMNS;

  // 2. Group data by painter
  const stats = new Map<string, { name: string; walls: number; total: number; rows: any[] }>();
  for (const p of allPainters) {
    stats.set(p._id.toString(), { name: p.name, walls: 0, total: 0, rows: [] });
  }

  for (const sub of dataGroups) {
    const pId = sub.painterId?._id ? sub.painterId._id.toString() : (sub.painterId?.toString() || 'unknown');
    const pName = sub.painterId?.name || 'Unknown painter';

    if (!stats.has(pId)) stats.set(pId, { name: pName, walls: 0, total: 0, rows: [] });
    
    const stat = stats.get(pId)!;
    for (const [L, B] of sub.sizes) {
      const rowTotal = L * B;
      stat.walls += 1;
      stat.total += rowTotal;
      grandTotal += rowTotal;
      stat.rows.push({ photoNo: sub.photoNo, location: sanitizeCell(sub.location), l: L, x: '×', b: B, total: rowTotal });
    }
  }

  const sortedPainters = Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Summary Block
  ws.addRow([]); 
  // Map: A='S.NO.', B='', C='PAINTER', D='WALLS', E='', F='TOTAL SQ. FT.', G=''
  const summaryHeader = ws.addRow(['S.NO.', '', 'PAINTER', 'WALLS', '', 'TOTAL SQ. FT.', '']);
  const shr = summaryHeader.number;
  ws.mergeCells(`A${shr}:B${shr}`); // S.NO. gets A and B
  // Painter gets C exclusively (natively the largest column at 49 width!)
  ws.mergeCells(`D${shr}:E${shr}`); // Walls gets D and E
  ws.mergeCells(`F${shr}:G${shr}`); // Total gets F and G
  
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

  // 4. Detailed Sections
  for (const p of sortedPainters) {
    if (p.rows.length === 0) continue; 

    ws.addRow([]); ws.addRow([]); 
    
    const pHeader = ws.addRow([sanitizeCell(p.name.toUpperCase()), '', '', '', '', '', '']);
    const phr = pHeader.number;
    ws.mergeCells(`A${phr}:G${phr}`);
    pHeader.font = { bold: true };
    pHeader.alignment = { horizontal: 'center', vertical: 'middle' }; 
    ws.getCell(`A${phr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    
    buildHeaderRow(ws, ws.addRow([]).number);
    const startDataRow = ws.lastRow!.number + 1;

    let sno = 1;
    for (const rData of p.rows) {
      ws.addRow({ sno: sno++, ...rData });
    }

    const endDataRow = ws.lastRow!.number;
    for (let r = startDataRow - 1; r <= endDataRow; r++) {
      for (let c = 1; c <= 7; c++) applyBordersAndCenter(ws, r, c);
    }

    buildTotalRow(ws, p.total, 'TOTAL SQ. FT. =');
  }

  // 5. Job Grand Total
  // CHANGED: Passes smoothly into our updated helper for right-alignment
  buildTotalRow(ws, grandTotal, 'GRAND TOTAL SQ. FT. =');
}
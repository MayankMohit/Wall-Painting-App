import PDFDocument from 'pdfkit';
import { fetchJobData } from './excelWorker';

const MARGIN = 36;
const A4_W = 595.28; // A4 portrait width (points)
const A4_H = 841.89; // A4 portrait height (points)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

/**
 * Renders the master list (same data as the master Excel) into a PDF that mirrors
 * the Excel layout: a centred title, a bordered table, and a grand-total row.
 * Handles both the standard portrait (7-column) sheet and the Format-B Van
 * landscape (6-column) sheet, matching buildMasterSheet()/getColumns().
 */
export async function buildMasterExcelPdf(
  jobId: string,
  header: { companyName: string; jobName: string; city: string }
): Promise<Buffer> {
  const { actualJobName, subs, pdfFormat, jobType } = await fetchJobData(jobId);

  const isFormatB = pdfFormat === 'B';
  const isVan = isFormatB && jobType === 'Van';

  // ── Flatten submissions into rows exactly like buildMasterSheet ──────────────
  const rows: string[][] = [];
  let grandTotal = 0;
  let sno = 1;

  for (const sub of subs as any[]) {
    const locText = isFormatB && sub.shopName ? `${sub.shopName} - ${sub.location}` : sub.location;
    if (isVan) {
      rows.push([
        String(sno++),
        String(sub.photoNo),
        locText,
        sub.vanNo || '—',
        sub.contactNo || '—',
        sub.aboveBelow || '—',
      ]);
    } else {
      for (const [L, B] of (sub.ownerSizes?.length ? sub.ownerSizes : sub.sizes) as number[][]) {
        const rowTotal = L * B;
        grandTotal += rowTotal;
        rows.push([String(sno++), String(sub.photoNo), locText, String(L), '×', String(B), String(rowTotal)]);
      }
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────────
  const layout: 'portrait' | 'landscape' = isVan ? 'landscape' : 'portrait';
  const pageW = layout === 'landscape' ? A4_H : A4_W;
  const pageH = layout === 'landscape' ? A4_W : A4_H;
  const contentW = pageW - MARGIN * 2;
  const bottomLimit = pageH - MARGIN;

  // Column widths proportional to the Excel column widths in getColumns().
  const fractions = isVan ? [8, 14, 58, 18, 18, 16] : [6, 10.5, 49, 5, 3, 5, 11.5];
  const fracSum = fractions.reduce((a, b) => a + b, 0);
  const colW = fractions.map((f) => (f / fracSum) * contentW);
  const colX: number[] = [];
  let acc = MARGIN;
  for (const w of colW) {
    colX.push(acc);
    acc += w;
  }

  const headers = isVan
    ? ['S.NO.', 'PHOTO NO.', 'LOCATION', 'VAN NO.', 'CONTACT NO.', 'POSITION']
    : ['S.NO.', 'PHOTO NO.', 'LOCATION', 'SIZE', '', '', 'TOTAL'];

  const MIN_ROW_H = 20;

  const doc: Doc = new PDFDocument({ size: 'A4', layout, margin: MARGIN, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  // Draw a single bordered cell with vertically-centred text.
  const drawCell = (
    x: number,
    w: number,
    y: number,
    h: number,
    text: string,
    opts: { bold?: boolean; align?: 'center' | 'right' } = {}
  ) => {
    const align = opts.align ?? 'center';
    doc.lineWidth(0.75).strokeColor('#000').rect(x, y, w, h).stroke();
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000');
    const th = doc.heightOfString(text || '', { width: w - 6, align });
    doc.text(text || '', x + 3, y + Math.max(2, (h - th) / 2), { width: w - 6, align });
  };

  // Draw the title (first page only) + the header row. Returns the y below it.
  const drawTitle = (y: number): number => {
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000');
    const title = `${actualJobName}`.toUpperCase();
    const tw = Math.min(doc.widthOfString(title), contentW);
    doc.text(title, MARGIN, y, { width: contentW, align: 'center' });
    // Manual underline centred under the title text only.
    const underY = doc.y + 1;
    doc.lineWidth(1).moveTo(MARGIN + (contentW - tw) / 2, underY).lineTo(MARGIN + (contentW + tw) / 2, underY).stroke();
    return y + 26;
  };

  const drawHeaderRow = (y: number): number => {
    const h = MIN_ROW_H;
    if (isVan) {
      headers.forEach((label, i) => drawCell(colX[i], colW[i], y, h, label, { bold: true }));
    } else {
      // Standard: S.NO. | PHOTO NO. | LOCATION | SIZE (merged cols 3-5) | TOTAL
      drawCell(colX[0], colW[0], y, h, headers[0], { bold: true });
      drawCell(colX[1], colW[1], y, h, headers[1], { bold: true });
      drawCell(colX[2], colW[2], y, h, headers[2], { bold: true });
      const sizeW = colW[3] + colW[4] + colW[5];
      drawCell(colX[3], sizeW, y, h, 'SIZE', { bold: true });
      drawCell(colX[6], colW[6], y, h, headers[6], { bold: true });
    }
    return y + h;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  doc.addPage();
  let y = MARGIN;
  y = drawTitle(y);
  y = drawHeaderRow(y);

  const locColIdx = 2;
  for (const row of rows) {
    // Location can wrap, so size the row to the tallest cell.
    doc.font('Helvetica').fontSize(9);
    const locH = doc.heightOfString(row[locColIdx] || '', { width: colW[locColIdx] - 6, align: 'center' });
    const h = Math.max(MIN_ROW_H, locH + 8);

    if (y + h > bottomLimit) {
      doc.addPage();
      y = MARGIN;
      y = drawHeaderRow(y);
    }

    row.forEach((val, i) => drawCell(colX[i], colW[i], y, h, val));
    y += h;
  }

  // ── Grand-total row (skipped for Van, matching the Excel) ────────────────────
  if (!isVan) {
    y += 8; // gap row, like the Excel's blank spacer
    const h = MIN_ROW_H;
    if (y + h > bottomLimit) {
      doc.addPage();
      y = MARGIN;
    }
    // Label spans the LOCATION + SIZE columns, right-aligned; value in TOTAL column.
    const labelX = colX[2];
    const labelW = colW[2] + colW[3] + colW[4] + colW[5];
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
    doc.text('TOTAL SQ. FT. =', labelX, y + 4, { width: labelW - 6, align: 'right' });
    doc.text(String(grandTotal), colX[6], y + 4, { width: colW[6], align: 'center' });
  }

  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

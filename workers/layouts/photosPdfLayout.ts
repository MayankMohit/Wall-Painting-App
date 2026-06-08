import PDFDocument from 'pdfkit';

// 1 cm = 28.3465 points
const CM_TO_PTS = 28.3465;
const PRINT_SHORT_PTS = 9 * CM_TO_PTS;
const PRINT_LONG_PTS = 13 * CM_TO_PTS;

export function drawPhotoPage(
  doc: typeof PDFDocument,
  imageBuffer: Buffer,
  imgW: number,
  imgH: number,
  generatedNumber: string
) {
  // PERMANENTLY LOCKED TO LANDSCAPE FOR PRINTING
  const pageWidthPts = PRINT_LONG_PTS;
  const pageHeightPts = PRINT_SHORT_PTS;

  // 1. Create the perfectly sized 13x9 landscape page
  doc.addPage({ size: [pageWidthPts, pageHeightPts], margin: 0 });

  // 2. Math for native "cover" scaling (fill the page, crop the overflow)
  const scale = Math.max(pageWidthPts / imgW, pageHeightPts / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const x = (pageWidthPts - drawW) / 2;
  const y = (pageHeightPts - drawH) / 2;

  // 3. Draw the image inside a clipping mask so it doesn't bleed off the page
  doc.save();
  doc.rect(0, 0, pageWidthPts, pageHeightPts).clip();
  doc.image(imageBuffer, x, y, { width: drawW, height: drawH });
  doc.restore();

  // 4. WATERMARK (Always locked to the extreme bottom-right of the landscape paper)
  const text = generatedNumber.startsWith('#') ? generatedNumber : `#${generatedNumber}`;
  
  const fontSize = 10;
  doc.fontSize(fontSize).font('Helvetica-Bold');

  const textW = doc.widthOfString(text);
  const textH = doc.heightOfString(text);

  const padX = 5;
  const padY = 3;
  const boxW = textW + (padX * 2);
  const boxH = textH + (padY * 2);

  // Locked to the extreme corner of the landscape paper
  const margin = 4;
  const boxX = pageWidthPts - boxW - margin;
  const boxY = pageHeightPts - boxH - margin;

  // Semi-transparent black rectangle
  doc.save()
     .rect(boxX, boxY, boxW, boxH)
     .fillColor('#000000')
     .fillOpacity(0.55)
     .fill()
     .restore();

  // Crisp white text
  doc.save()
     .fillColor('#FFFFFF')
     .fillOpacity(1)
     .text(text, boxX + padX, boxY + padY, { lineBreak: false })
     .restore();
}
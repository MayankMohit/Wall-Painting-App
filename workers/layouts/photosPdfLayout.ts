import PDFDocument from 'pdfkit';

const CM_TO_PTS = 28.3465;
export const PHOTO_PAGE_WIDTH_CM = 13; // all pages share this width; height varies by aspect ratio
const TARGET_WIDTH_PTS = PHOTO_PAGE_WIDTH_CM * CM_TO_PTS;

export function drawPhotoPage(
  doc: typeof PDFDocument,
  imageBuffer: Buffer,
  imgW: number,
  imgH: number,
  generatedNumber: string
) {
  const pageW = TARGET_WIDTH_PTS;
  const pageH = pageW * (imgH / imgW); // height derived from aspect ratio — never crops

  doc.addPage({ size: [pageW, pageH], margin: 0 });

  // Fill page exactly — one-to-one aspect ratio, no overflow, no crop
  doc.image(imageBuffer, 0, 0, { width: pageW, height: pageH });

  // Badge — bottom-right corner
  const text = generatedNumber.startsWith('#') ? generatedNumber : `#${generatedNumber}`;
  const fontSize = 10;
  doc.fontSize(fontSize).font('Helvetica-Bold');

  const textW = doc.widthOfString(text);
  const textH = doc.heightOfString(text);
  const padX = 6;
  const padY = 4;
  const boxW = textW + padX * 2;
  const boxH = textH + padY * 2;
  const margin = 5;
  const boxX = pageW - boxW - margin;
  const boxY = pageH - boxH - margin;

  // Soft semi-transparent backdrop
  doc.save()
     .rect(boxX, boxY, boxW, boxH)
     .fillColor('#000000')
     .fillOpacity(0.35)
     .fill()
     .restore();

  // Crisp white label
  doc.save()
     .fillColor('#FFFFFF')
     .fillOpacity(1)
     .text(text, boxX + padX, boxY + padY, { lineBreak: false })
     .restore();
}

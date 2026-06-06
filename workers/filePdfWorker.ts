import PDFDocument from 'pdfkit';
import { Submission } from '@/lib/models/Submission';
import { User } from '@/lib/models/User';

const A4 = { w: 595.28, h: 841.89 }; // points (72 dpi)
const MARGIN = 36;

type ExcelRow = {
  sno: number;
  photoNo: number;
  painterId: string;
  location: string;
  l: number;
  b: number;
};

export async function buildFilePdf(
  jobId: string,
  ownerId: string,
  letterhead: { companyName: string; address: string }, // Kept so your API route doesn't break!
  excelRows: ExcelRow[] 
) {
  // We can leave this here in case you want to use it later, but we will ignore it for drawing.
  await User.updateOne({ _id: ownerId }, { $set: { letterhead } });

  const serialByKey = new Map<string, number[]>();
  excelRows.forEach((r) => {
    const key = `${r.painterId}_${r.photoNo}`;
    const list = serialByKey.get(key) ?? [];
    list.push(r.sno);
    serialByKey.set(key, list);
  });

  const getSerialRange = (key: string) => {
    const arr = serialByKey.get(key) ?? [];
    if (!arr.length) return '—';
    return arr.length === 1 ? String(arr[0]) : `${arr[0]}-${arr.at(-1)}`;
  };

  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('images', 'generatedNumber') 
    .lean();

  const groups = new Map<string, { photoNo: number; location: string; sizes: number[][]; codes: string[] }>();
  
  for (const s of subs) {
    const key = `${s.painterId}_${s.photoNo}`;
    const g = groups.get(key) ?? { photoNo: s.photoNo, location: s.location, sizes: [], codes: [] };
    g.sizes.push(...s.sizes);
    
    const imgDocs = s.images as any[];
    g.codes.push(...imgDocs.map(i => i.generatedNumber).filter(Boolean));
    
    groups.set(key, g);
  }

  const sections = Array.from(groups.entries()).map(([key, g]) => ({
    ...g,
    serialRange: getSerialRange(key),
  }));

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));

  for (let i = 0; i < sections.length; i += 2) {
    doc.addPage();

    // ---- HARDCODED LETTERHEAD ----
    doc.font('Times-Bold').fontSize(32).text('SAHU AD.', { align: 'center' });
    
    // Draw the thick underline JUST under "SAHU AD." to match your template
    const titleWidth = doc.widthOfString('SAHU AD.');
    const titleX = (A4.w - titleWidth) / 2;
    const titleY = doc.y;
    doc.lineWidth(2).moveTo(titleX, titleY).lineTo(titleX + titleWidth, titleY).stroke();
    doc.lineWidth(1); // Reset to default thin line for the boxes later
    
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text('Address - Piska More, Ratu Road, Ranchi, Mo: 9123232592', { align: 'center' });
    doc.moveDown(1.5);
    
    // Calculate EXACT available space for the two sections
    const contentStartY = doc.y; 
    const sectionHeight = (A4.h - contentStartY - MARGIN) / 2; // Divide available space exactly in half

    // ---- Draw the two sections ----
    const topSection = sections[i];
    const bottomSection = sections[i + 1]; 

    // Pass the strict coordinates so PDFKit perfectly splits the page down to the margin
    drawSection(doc, topSection, contentStartY, sectionHeight);
    
    if (bottomSection) {
      drawSection(doc, bottomSection, contentStartY + sectionHeight, sectionHeight);
    }
  }

  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ---- HELPER: Draws the physical paste-box filling the calculated height ----
function drawSection(doc: typeof PDFDocument, sec: any, yStart: number, sectionHeight: number) {
  const x = MARGIN;
  const w = A4.w - 2 * MARGIN;
  let y = yStart;

  // 1. Text Info (Location + Sizes)
  doc.font('Helvetica').fontSize(11).fillColor('#000');
  doc.text(`LOCATION :  ${sec.location}`, x, y);
  
  y += 16;
  const sizeString = sec.sizes.map((s: number[]) => `${s[0]}×${s[1]}`).join(', ');
  doc.text(`SIZE :-           ${sizeString}`, x, y);
  
  y += 20; // Breathing room before the box starts

  // 2. The Box Geometry
  const gapBetweenSections = 15; // Empty space between the top box and bottom text
  const boxH    = sectionHeight - (y - yStart) - gapBetweenSections; // Dynamically stretch box
  const rightW  = 130; 
  const boxW    = w - rightW;

  // Draw the single rectangle
  doc.lineWidth(1).rect(x, y, boxW, boxH).stroke();

  // 3. Right Column: Photo No & Serial No (Clean formatting)
  const rightX = x + boxW + 15;
  
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Photo no...........`, rightX, y + 10);
  doc.font('Helvetica').text(`${sec.photoNo}`, rightX, doc.y + 2);

  doc.font('Helvetica-Bold').text(`Serial No...........`, rightX, doc.y + 15);
  doc.font('Helvetica').text(`${sec.serialRange}`, rightX, doc.y + 2);

  // 4. Centered Watermarks Inside the Box
  const codeText = sec.codes.join('   ');
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#9ca3af'); 
  
  // Calculate perfect vertical and horizontal center relative to the dynamic box
  const textOptions = { width: boxW, align: 'center' as const };
  const textHeight = doc.heightOfString(codeText, textOptions);
  const textY = y + (boxH / 2) - (textHeight / 2);

  doc.text(codeText, x, textY, textOptions);
  doc.fillColor('#000'); // Reset color
}
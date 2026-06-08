import PDFDocument from 'pdfkit';

const A4 = { w: 595.28, h: 841.89 }; // points (72 dpi)
const MARGIN = 36;

export function drawPdfPage(
  doc: typeof PDFDocument,
  letterhead: { companyName: string; address: string },
  topSection: any,
  bottomSection: any
) {
  const maxW = A4.w - 2 * MARGIN;

  // ---- DYNAMIC LETTERHEAD ----
  doc.font('Times-Bold').fontSize(32);
  
  const rawTitleWidth = doc.widthOfString(letterhead.companyName);
  const titleLineW = Math.min(rawTitleWidth, maxW);
  const titleLineX = (A4.w - titleLineW) / 2;
  const titleY = doc.y; 
  
  doc.text(letterhead.companyName, MARGIN, titleY, { width: maxW, align: 'center' });
  
  const underlineY = doc.y - 2; 
  doc.lineWidth(2).moveTo(titleLineX, underlineY).lineTo(titleLineX + titleLineW, underlineY).stroke();
  doc.lineWidth(1); 
  
  doc.y = underlineY + 8;
  
  doc.font('Helvetica').fontSize(10);
  doc.text(letterhead.address, MARGIN, doc.y, { width: maxW, align: 'center' });
  doc.moveDown(1.5);
  
  const contentStartY = doc.y; 
  const sectionHeight = (A4.h - contentStartY - MARGIN) / 2; 

  // ---- Draw the two sections ----
  drawSectionBox(doc, topSection, contentStartY, sectionHeight);
  
  if (bottomSection) {
    drawSectionBox(doc, bottomSection, contentStartY + sectionHeight, sectionHeight);
  }
}

// ---- HELPER: Draws the physical paste-box ----
function drawSectionBox(doc: typeof PDFDocument, sec: any, yStart: number, sectionHeight: number) {
  const x = MARGIN;
  const w = A4.w - 2 * MARGIN;
  
  const rightColumnWidth = 90; 
  const gap = 15;
  const boxW = w - rightColumnWidth - gap;
  const rightX = x + boxW + gap;
  let y = yStart + 10; 

  const fullLeftColumnWidth = w - (rightColumnWidth + gap);
  const baselineOffset = 11;

  function drawFormField(label: string, value: string, currentY: number) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
    const labelW = doc.widthOfString(label);
    doc.text(label, x, currentY, { lineBreak: false });

    const lineStartX = x + labelW + 10;
    const lineW = fullLeftColumnWidth - labelW - 10;

    doc.font('Helvetica');
    
    // Explicitly set a 6pt gap between lines of text so it breathes
    const textOptions = { width: lineW - 10, align: 'left' as const, lineGap: 6 };
    
    // Calculate exact height of one line + the gap
    const singleLineH = doc.currentLineHeight() + 6; 
    const textH = doc.heightOfString(value || ' ', textOptions);
    const lines = Math.max(1, Math.round(textH / singleLineH));

    // Position the physical line right at the bottom of the text's bounding box
    const baselineOffset = singleLineH - 4; 

    // Draw the underlines
    for (let i = 0; i < lines; i++) {
       const lineY = currentY + (i * singleLineH) + baselineOffset;
       doc.lineWidth(1).moveTo(lineStartX, lineY).lineTo(lineStartX + lineW, lineY).stroke();
    }

    // Draw the text
    doc.text(value || '', lineStartX + 5, currentY, textOptions);

    // Return the new Y coordinate (pushed down, plus a little extra padding)
    return currentY + (lines * singleLineH) + 5; 
  }

  // 1. LOCATION LINE (Now protected against long addresses)
  y = drawFormField("LOCATION", sec.location || '', y);
  y += 15; // Vertical gap between Location and Size

  // 2. SIZE LINE (Now protected against massive lists of sizes)
  // Added optional chaining (?.) just in case sizes is missing
  const sizeString = sec.sizes?.map((s: number[]) => `${s[0]} x ${s[1]}`).join('  -  ') || '';
  y = drawFormField("SIZE :- ", sizeString, y);
  y += 20; // Vertical gap before the main photo paste box

  // 3. THE MAIN BOX (Height shrinks automatically if the text above it wrapped!)
  const boxY = y;
  const boxH = sectionHeight - (boxY - yStart) - 20; 
  doc.lineWidth(1).rect(x, boxY, boxW, boxH).stroke();

  // 4. RIGHT COLUMN
  doc.fillColor('#000'); 
  let rightY = boxY + 10; // Aligns perfectly with the new, dynamically pushed boxY

  // Photo Label
  doc.font('Helvetica-Bold').fontSize(11);
  const photoNoLabel = "Photo no.";
  doc.text(photoNoLabel, rightX, rightY, { lineBreak: false });
  
  const labelGapPhoto = 5;
  const photoLabelW = doc.widthOfString(photoNoLabel);
  const lineStartXPhoto = rightX + photoLabelW + labelGapPhoto;
  const lineWPhoto = rightColumnWidth - photoLabelW - labelGapPhoto;
  
  // Line at baseline
  doc.lineWidth(1).moveTo(lineStartXPhoto, rightY + baselineOffset).lineTo(lineStartXPhoto + lineWPhoto, rightY + baselineOffset).stroke();
  doc.font('Helvetica');
  doc.text(`${sec.photoNo}`, lineStartXPhoto + 5, rightY, { lineBreak: false });

  rightY += 40; 
  
  // Serial Label
  doc.font('Helvetica-Bold');
  const serialNoLabel = "Serial No.";
  doc.text(serialNoLabel, rightX, rightY, { lineBreak: false });
  
  const labelGapSerial = 5; 
  const serialLabelW = doc.widthOfString(serialNoLabel);
  const lineStartXSerial = rightX + serialLabelW + labelGapSerial;
  const lineWSerial = rightColumnWidth - serialLabelW - labelGapSerial;
  
  // Line at baseline
  doc.lineWidth(1).moveTo(lineStartXSerial, rightY + baselineOffset).lineTo(lineStartXSerial + lineWSerial, rightY + baselineOffset).stroke();
  doc.font('Helvetica');
  doc.text(`${sec.serialRange}`, lineStartXSerial + 5, rightY, { lineBreak: false });

  // 5. CENTERED WATERMARKS
  if (sec.codes && sec.codes.length > 0) {
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#6b7280'); 
    
    const chunkedCodes = [];
    for (let i = 0; i < sec.codes.length; i += 4) {
      chunkedCodes.push(sec.codes.slice(i, i + 4).join('   '));
    }
    
    const formattedCodeText = chunkedCodes.join('\n');
    const textOptions = { width: boxW, align: 'center' as const };
    const textHeight = doc.heightOfString(formattedCodeText, textOptions);
    const textY = boxY + (boxH / 2) - (textHeight / 2); 

    doc.text(formattedCodeText, x, textY, textOptions);
  }

  doc.fillColor('#000'); 
}
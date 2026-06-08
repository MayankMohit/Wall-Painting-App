import PDFDocument from 'pdfkit';

const A4 = { w: 595.28, h: 841.89 }; // points (72 dpi)
const MARGIN = 36;

export function drawPdfPage(
  doc: typeof PDFDocument,
  letterhead: { companyName: string; address: string },
  topSection: any,
  bottomSection: any
) {
  // Establish the absolute maximum width allowed for any text
  const maxW = A4.w - 2 * MARGIN;

  // ---- DYNAMIC LETTERHEAD ----
  doc.font('Times-Bold').fontSize(32);
  
  // Calculate the underline width (cap it at maxW so it never goes off-page)
  const rawTitleWidth = doc.widthOfString(letterhead.companyName);
  const titleLineW = Math.min(rawTitleWidth, maxW);
  const titleLineX = (A4.w - titleLineW) / 2;
  
  const titleY = doc.y; 
  
  // Draw the text using the `width` property. This forces it to wrap to the next line if it's too long!
  doc.text(letterhead.companyName, MARGIN, titleY, { width: maxW, align: 'center' });
  
  // doc.y is automatically updated by PDFKit to be at the bottom of the newly drawn text block.
  // We place the underline right below whatever the final line of text was.
  const underlineY = doc.y - 2; 
  
  doc.lineWidth(2).moveTo(titleLineX, underlineY).lineTo(titleLineX + titleLineW, underlineY).stroke();
  doc.lineWidth(1); 
  
  // Add a clean gap before the address
  doc.y = underlineY + 8;
  
  doc.font('Helvetica').fontSize(10);
  // Do the same wrapping protection for the address
  doc.text(letterhead.address, MARGIN, doc.y, { width: maxW, align: 'center' });
  doc.moveDown(1.5);
  
  // Because doc.y is pushed down dynamically if the header wrapped, 
  // this math perfectly shrinks the photo boxes so nothing overflows!
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
  
  // Push right column further right (was 130, now 90) to give photo box more width
  const rightColumnWidth = 90; 
  const gap = 15;
  const boxW = w - rightColumnWidth - gap;
  const rightX = x + boxW + gap;
  let y = yStart + 10; 

  const lineHeight = 30; 
  const boxTopGap = 20; 

  const fullLeftColumnWidth = w - (rightColumnWidth + gap);

  // Magic number to make lines sit at the bottom of the letters
  const baselineOffset = 11;

  // 1. LOCATION LINE
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
  const locationLabel = "LOCATION"; 
  const locationLabelWidth = doc.widthOfString(locationLabel);
  doc.text(locationLabel, x, y, { lineBreak: false });

  const labelLineGapLocation = 10; 
  const lineStartXLocation = x + locationLabelWidth + labelLineGapLocation;
  const lineWLocation = fullLeftColumnWidth - (locationLabelWidth + labelLineGapLocation);
  
  // Draw solid line at the baseline
  doc.lineWidth(1).moveTo(lineStartXLocation, y + baselineOffset).lineTo(lineStartXLocation + lineWLocation, y + baselineOffset).stroke();

  // Draw value text at top Y so it sits naturally ON the line
  doc.font('Helvetica');
  doc.text(sec.location || '', lineStartXLocation + 5, y, { lineBreak: false });

  y += lineHeight;

  // 2. SIZE LINE
  doc.font('Helvetica-Bold');
  const sizeLabel = "SIZE :- "; 
  const sizeLabelWidth = doc.widthOfString(sizeLabel);
  doc.text(sizeLabel, x, y, { lineBreak: false });

  const labelLineGapSize = 10; 
  const lineStartXSize = x + sizeLabelWidth + labelLineGapSize;
  const lineWSize = fullLeftColumnWidth - (sizeLabelWidth + labelLineGapSize);
  
  // Draw solid line at the baseline
  doc.lineWidth(1).moveTo(lineStartXSize, y + baselineOffset).lineTo(lineStartXSize + lineWSize, y + baselineOffset).stroke();

  doc.font('Helvetica');
  const sizeString = sec.sizes.map((s: number[]) => `${s[0]}×${s[1]}`).join(', ') || '';
  doc.text(sizeString, lineStartXSize + 5, y, { lineBreak: false });

  y += boxTopGap; 

  // 3. THE MAIN BOX
  const boxY = y;
  const boxH = sectionHeight - (boxY - yStart) - 20; 
  doc.lineWidth(1).rect(x, boxY, boxW, boxH).stroke();

  // 4. RIGHT COLUMN
  doc.fillColor('#000'); 
  let rightY = boxY + 10; // Push down slightly inside the column

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
  // Text ON the line
  doc.font('Helvetica');
  doc.text(`${sec.photoNo}`, lineStartXPhoto + 5, rightY, { lineBreak: false });

  rightY += 40; // Big vertical space between photo and serial
  
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
  // Text ON the line
  doc.font('Helvetica');
  doc.text(`${sec.serialRange}`, lineStartXSerial + 5, rightY, { lineBreak: false });

  // 5. CENTERED WATERMARKS (Forced 4 items per line)
  if (sec.codes && sec.codes.length > 0) {
    // UPDATED: Changed from #9ca3af to #6b7280 for a darker, crisper watermark
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#6b7280'); 
    
    // Chunk the codes array into groups of 4
    const chunkedCodes = [];
    for (let i = 0; i < sec.codes.length; i += 4) {
      chunkedCodes.push(sec.codes.slice(i, i + 4).join('   '));
    }
    
    // Join the chunks with a hard line break (\n)
    const formattedCodeText = chunkedCodes.join('\n');
    
    const textOptions = { width: boxW, align: 'center' as const };
    
    // doc.heightOfString will account for the \n line breaks
    const textHeight = doc.heightOfString(formattedCodeText, textOptions);
    
    // Calculate perfect vertical center based on the multi-line height
    const textY = boxY + (boxH / 2) - (textHeight / 2); 

    // Draw the final block
    doc.text(formattedCodeText, x, textY, textOptions);
  }

  doc.fillColor('#000'); 
}
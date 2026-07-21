// eslint-disable-next-line @typescript-eslint/no-explicit-any
import PDFDocument from 'pdfkit';

const A4 = { w: 595.28, h: 841.89 }; // points (72 dpi)

const LEFT_MARGIN = 56;
const RIGHT_MARGIN = 36;
const MAX_W = A4.w - LEFT_MARGIN - RIGHT_MARGIN;

export function drawPdfPage(
  doc: typeof PDFDocument,
  letterhead: { companyName: string; address: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topSection: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bottomSection?: any,
  pageTracker: { count: number } = { count: 1 }
) {
  const drawPageNum = () => {
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    doc.text(`Page ${pageTracker.count}`, 0, 20, { width: A4.w - RIGHT_MARGIN, align: 'right' });
    doc.fillColor('#000'); // Reset color
  };

  const isFormatBTop = !!(topSection.shopName || topSection.contactNo || topSection.vanNo);

  if (isFormatBTop) {
    // ---- FORMAT B: FULL PAGE ----
    drawPageNum();
    drawFormatB_FullPage(doc, letterhead, topSection);

    if (bottomSection) {
      doc.addPage();
      pageTracker.count++;
      const isFormatBBottom = !!(bottomSection.shopName || bottomSection.contactNo || bottomSection.vanNo);
      if (isFormatBBottom) {
        drawPageNum();
        drawFormatB_FullPage(doc, letterhead, bottomSection);
      } else {
        // Fallback: If mixed types
        drawPageNum();
        drawFormatA_Header(doc, letterhead);
        const contentStartY = doc.y;
        const sectionHeight = (A4.h - contentStartY - 36) / 2;
        drawFormatA_Box(doc, bottomSection, contentStartY, sectionHeight);
      }
    }
  } else {
    // ---- FORMAT A: 2 PER PAGE ----
    drawPageNum();
    drawFormatA_Header(doc, letterhead);
    const contentStartY = doc.y;
    const sectionHeight = (A4.h - contentStartY - 36) / 2;

    drawFormatA_Box(doc, topSection, contentStartY, sectionHeight);

    if (bottomSection) {
      const isFormatBBottom = !!(bottomSection.shopName || bottomSection.contactNo || bottomSection.vanNo);
      if (isFormatBBottom) {
        doc.addPage();
        pageTracker.count++;
        drawPageNum();
        drawFormatB_FullPage(doc, letterhead, bottomSection);
      } else {
        drawFormatA_Box(doc, bottomSection, contentStartY + sectionHeight, sectionHeight);
      }
    }
  }
  pageTracker.count++;
}

// ============================================================================
// FORMAT B: ANNEXURE-I (FULL PAGE)
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawFormatB_FullPage(doc: typeof PDFDocument, letterhead: any, sec: any) {
  doc.y = 36; // Start from top

  // --- Header Area ---
  doc.font('Helvetica-Bold').fontSize(26).fillColor('#000');
  doc.text(letterhead.companyName || 'SAHU AD.', LEFT_MARGIN, doc.y, { width: MAX_W, align: 'center' });
  
  doc.font('Helvetica').fontSize(9);
  doc.text("Unique Transaction Number (UTN) - online entry:", LEFT_MARGIN, doc.y, { width: MAX_W, align: 'center' });
  doc.font('Helvetica-Bold');
  doc.text("CLAIM FORMAT (ANNEXURE-I)", LEFT_MARGIN, doc.y, { width: MAX_W, align: 'center' });
  doc.moveDown(1.5);

  // --- Supplier Info ---
  doc.font('Helvetica').fontSize(10);
  doc.text(`Supplier Name: `, LEFT_MARGIN, doc.y);
  // Address remains explicitly blank per instructions
  doc.text(`Supplier Address & Contact nos: `);
  
  doc.font('Helvetica').text(`GCMMF BRANCH NAME: `, { continued: true })
     .font('Helvetica-Bold').text(`RANCHI`);
  doc.moveDown(1.5);

  // --- Challan Row ---
  const challanY = doc.y;
  doc.font('Helvetica').fontSize(10);
  doc.text("Challan No.: _________________", LEFT_MARGIN, challanY);
  doc.font('Helvetica-Bold');
  doc.text("DELIVERY/INSTALLATION CHALLAN", LEFT_MARGIN, challanY, { align: 'center', width: MAX_W });
  doc.font('Helvetica');
  doc.text("Date: _________________", LEFT_MARGIN, challanY, { align: 'right', width: MAX_W });
  
  // --- Table 1: Shop Info ---
  let ty = challanY + 20;
  const col1W = 180;
  const col2W = MAX_W - col1W;
  const rowH = 16;

  const t1Data = [
    ["Name of the Shop/office/Person", sec.shopName || ''],
    ["Unique Retailer Number (DMS)", ""],
    ["Address", sec.location || ''],
    ["Contact Nos.", sec.contactNo || ''],
    ["Van No.", sec.vanNo || ''],
    ["Name of Company", ""],
    ["Brand Name", ""]
  ];

  doc.lineWidth(1).strokeColor('#000');
  for (let i = 0; i < t1Data.length; i++) {
    // Gray out Row 2
    if (i === 1) {
      doc.rect(LEFT_MARGIN, ty, col1W, rowH).fillAndStroke('#d1d5db', '#000');
      doc.fillColor('#000');
    } else {
      doc.rect(LEFT_MARGIN, ty, col1W, rowH).stroke();
    }
    doc.rect(LEFT_MARGIN + col1W, ty, col2W, rowH).stroke();

    doc.font(i === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(t1Data[i][0], LEFT_MARGIN + 4, ty + 4, { width: col1W - 8 });
    doc.font('Helvetica');
    doc.text(t1Data[i][1], LEFT_MARGIN + col1W + 12, ty + 4, { width: col2W - 16 });

    ty += rowH;
  }

  // --- Table 2: Particulars ---
  ty += 15;
  doc.font('Helvetica-Bold').fontSize(10).text("Particulars :", LEFT_MARGIN, ty);
  ty += 15;
  
  // FIX: Detect if this is a Pure Van Job (has aboveBelow, OR has vanNo without sizes)
  const isPureVan = !!sec.aboveBelow || (!sec.sizes?.length && !!sec.vanNo);

  const pColW = [40, 260, 110, MAX_W - 410]; // Auto-scales Qty width based on available room
  const pColX = [LEFT_MARGIN, LEFT_MARGIN + pColW[0], LEFT_MARGIN + pColW[0] + pColW[1], LEFT_MARGIN + pColW[0] + pColW[1] + pColW[2]];
  const pHeaders = ["S.No.", "Type Materials & Job details", "Size", isPureVan ? "Amount" : "Qty."];

  for (let c = 0; c < 4; c++) {
    doc.rect(pColX[c], ty, pColW[c], rowH).stroke();
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(pHeaders[c], pColX[c], ty + 4, { width: pColW[c], align: 'center' });
  }
  ty += rowH;

  doc.font('Helvetica').fontSize(9); 

  if (isPureVan) {
    // Determine Van Price based on position
    let vanPrice = "-";
    if (sec.aboveBelow?.toLowerCase() === 'above') vanPrice = "Rs. 3350";
    else if (sec.aboveBelow?.toLowerCase() === 'below') vanPrice = "Rs. 2350";

    // 3-Row Layout for Pure Van Jobs
    for (let i = 0; i < 3; i++) {
      for (let c = 0; c < 4; c++) doc.rect(pColX[c], ty, pColW[c], rowH).stroke();
      
      // Middle row (i === 1) gets the data
      if (i === 1) {
        doc.text("1", pColX[0], ty + 4, { width: pColW[0], align: 'center' });
        doc.text("Van Painting", pColX[1], ty + 4, { width: pColW[1], align: 'center' });
        // Size column uses Position (Above/Below)
        doc.text(sec.aboveBelow || '-', pColX[2], ty + 4, { width: pColW[2], align: 'center' });
        doc.text(vanPrice, pColX[3], ty + 4, { width: pColW[3], align: 'center' });
      }
      ty += rowH;
    }
    
    // Total Row
    doc.rect(pColX[0], ty, pColW[0] + pColW[1] + pColW[2], rowH).stroke();
    doc.rect(pColX[3], ty, pColW[3], rowH).stroke();
    doc.font('Helvetica-Bold');
    doc.text("Total", pColX[2], ty + 4, { width: pColW[2], align: 'center' });
    doc.text(vanPrice, pColX[3], ty + 4, { width: pColW[3], align: 'center' });
    ty += rowH;

  } else {
    // 5-Row Layout for Standard / Mixed Jobs
    let totalSqFt = 0;
    let hasVanRowPrice = false;
    let mixedVanPrice = "-";
    
    for (let i = 0; i < 5; i++) {
      for (let c = 0; c < 4; c++) doc.rect(pColX[c], ty, pColW[c], rowH).stroke();
      
      if (sec.sizes && sec.sizes[i]) {
        doc.text((i + 1).toString(), pColX[0], ty + 4, { width: pColW[0], align: 'center' });

        const labelStr = sec.sizeLabels?.[i] || "Wall Painting";
        const isRowVan = labelStr.toLowerCase().includes('van');
          
        const sizeStr = isRowVan 
          ? (sec.aboveBelow || '') 
          : `${sec.sizes[i][0]} x ${sec.sizes[i][1]}`;
          
        doc.text(labelStr, pColX[1], ty + 4, { width: pColW[1], align: 'center' });
        doc.text(sizeStr, pColX[2], ty + 4, { width: pColW[2], align: 'center' });

        // If it is a van row mixed in, apply flat rate instead of sqft
        if (isRowVan) {
          hasVanRowPrice = true;
          if (sec.aboveBelow?.toLowerCase() === 'above') mixedVanPrice = "3350";
          else if (sec.aboveBelow?.toLowerCase() === 'below') mixedVanPrice = "2350";
          doc.text(mixedVanPrice, pColX[3], ty + 4, { width: pColW[3], align: 'center' });
        } else {
          const sqft = sec.sizes[i][0] * sec.sizes[i][1];
          totalSqFt += sqft;
          doc.text(`${sqft.toFixed(1)} ft²`, pColX[3], ty + 4, { width: pColW[3], align: 'center' });
        }
      }
      ty += rowH;
    }

    // Total Row
    doc.rect(pColX[0], ty, pColW[0] + pColW[1] + pColW[2], rowH).stroke();
    doc.rect(pColX[3], ty, pColW[3], rowH).stroke();
    doc.font('Helvetica-Bold');
    doc.text("Total", pColX[2], ty + 4, { width: pColW[2], align: 'center' });

    // Handle Total column output based on what was mixed in
    if (hasVanRowPrice && totalSqFt === 0) {
      doc.text(mixedVanPrice, pColX[3], ty + 4, { width: pColW[3], align: 'center' });
    } else {
      doc.text(totalSqFt > 0 ? `${totalSqFt.toFixed(1)} ft²` : "", pColX[3], ty + 4, { width: pColW[3], align: 'center' });
    }
    
    ty += rowH;
  }

  // --- Photo Box ---
  ty += 10;
  const boxH = A4.h - ty - 140; 
  doc.rect(LEFT_MARGIN, ty, MAX_W, boxH).stroke();

  if (sec.codes && sec.codes.length > 0) {
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#9ca3af');
    const chunkedCodes = [];
    for (let i = 0; i < sec.codes.length; i += 4) {
      chunkedCodes.push(sec.codes.slice(i, i + 4).join('   '));
    }
    const formattedCodeText = chunkedCodes.join('\n');
    const textHeight = doc.heightOfString(formattedCodeText, { width: MAX_W, align: 'center' });
    const textY = ty + (boxH / 2) - (textHeight / 2);
    doc.text(formattedCodeText, LEFT_MARGIN, textY, { width: MAX_W, align: 'center' });
  }

  // --- Signatures ---
  ty += boxH + 10;
  doc.font('Helvetica').fontSize(9).fillColor('#000');
  doc.text("I hereby confirm placement of above POS", LEFT_MARGIN, ty);
  doc.text("FFR/TSI/OIC(FL)/ Branch Manager / BCAI", LEFT_MARGIN, ty + 35);

  const sigBoxW = 200;
  const sigBoxH = 45;
  const sigBoxX = A4.w - RIGHT_MARGIN - sigBoxW;
  doc.rect(sigBoxX, ty, sigBoxW, sigBoxH).stroke();
  doc.text("Retailer Signature & Rubber Stamp", sigBoxX + 5, ty + 5);
  doc.text("with Date", sigBoxX + 5, ty + 17);
}

// ============================================================================
// FORMAT A: ORIGINAL COMPONENTS (PRESERVED BUT MARGINS UPDATED)
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawFormatA_Header(doc: typeof PDFDocument, letterhead: any) {
  doc.font('Times-Bold').fontSize(32).fillColor('#111827');
  
  const rawTitleWidth = doc.widthOfString(letterhead.companyName);
  const titleLineW = Math.min(rawTitleWidth, MAX_W);
  const titleLineX = LEFT_MARGIN + (MAX_W - titleLineW) / 2;
  const titleY = doc.y; 
  
  doc.text(letterhead.companyName, LEFT_MARGIN, titleY, { width: MAX_W, align: 'center' });
  
  const underlineY = doc.y - 8; 
  doc.lineWidth(1.5).strokeColor('#374151')
     .moveTo(titleLineX, underlineY)
     .lineTo(titleLineX + titleLineW, underlineY)
     .stroke();
     
  doc.lineWidth(1).strokeColor('#000000'); 
  doc.y = underlineY + 12;
  
  doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
  doc.text(letterhead.address, LEFT_MARGIN, doc.y, { width: MAX_W, align: 'center' });
  
  doc.fillColor('#000000');
  doc.moveDown(2); 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawFormatA_Box(doc: typeof PDFDocument, sec: any, yStart: number, sectionHeight: number) {
  const rightColumnWidth = 90; 
  const gap = 15;
  const boxW = MAX_W - rightColumnWidth - gap;
  const rightX = LEFT_MARGIN + boxW + gap;
  let y = yStart + 10; 

  const fullLeftColumnWidth = MAX_W - (rightColumnWidth + gap);
  const baselineOffset = 11;

  function drawFormField(label: string, value: string, currentY: number) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
    const labelW = doc.widthOfString(label);
    doc.text(label, LEFT_MARGIN, currentY, { lineBreak: false });

    const lineStartX = LEFT_MARGIN + labelW + 10;
    const lineW = fullLeftColumnWidth - labelW - 10;

    doc.font('Helvetica');
    const textOptions = { width: lineW - 10, align: 'left' as const, lineGap: 6 };
    const singleLineH = doc.currentLineHeight() + 6; 
    const textH = doc.heightOfString(value || ' ', textOptions);
    const lines = Math.max(1, Math.round(textH / singleLineH));
    const currentBaselineOffset = singleLineH - 4; 

    for (let i = 0; i < lines; i++) {
       const lineY = currentY + (i * singleLineH) + currentBaselineOffset;
       doc.lineWidth(1).moveTo(lineStartX, lineY).lineTo(lineStartX + lineW, lineY).stroke();
    }

    doc.text(value || '', lineStartX + 5, currentY, textOptions);
    return currentY + (lines * singleLineH) + 5; 
  }

  y = drawFormField("LOCATION", sec.location || '', y);
  y += 15; 

  const sizeString = sec.sizes?.map((s: number[]) => `${s[0]} x ${s[1]}`).join('  -  ') || '';
  y = drawFormField("SIZE :- ", sizeString, y);
  y += 20; 

  const boxY = y;
  const boxH = Math.max(sectionHeight - (boxY - yStart) - 20, 50); 
  doc.lineWidth(1).rect(LEFT_MARGIN, boxY, boxW, boxH).stroke();

  doc.fillColor('#000'); 
  let rightY = boxY + 10;

  doc.font('Helvetica-Bold').fontSize(11);
  const photoNoLabel = "Photo no.";
  doc.text(photoNoLabel, rightX, rightY, { lineBreak: false });
  
  const labelGapPhoto = 5;
  const photoLabelW = doc.widthOfString(photoNoLabel);
  const lineStartXPhoto = rightX + photoLabelW + labelGapPhoto;
  const lineWPhoto = rightColumnWidth - photoLabelW - labelGapPhoto;
  
  doc.lineWidth(1).moveTo(lineStartXPhoto, rightY + baselineOffset).lineTo(lineStartXPhoto + lineWPhoto, rightY + baselineOffset).stroke();
  doc.font('Helvetica');
  doc.text(`${sec.photoNo}`, lineStartXPhoto + 5, rightY, { lineBreak: false });

  rightY += 40; 
  
  doc.font('Helvetica-Bold');
  const serialNoLabel = "Serial No.";
  doc.text(serialNoLabel, rightX, rightY, { lineBreak: false });
  
  const labelGapSerial = 5; 
  const serialLabelW = doc.widthOfString(serialNoLabel);
  const lineStartXSerial = rightX + serialLabelW + labelGapSerial;
  const lineWSerial = rightColumnWidth - serialLabelW - labelGapSerial;
  
  doc.lineWidth(1).moveTo(lineStartXSerial, rightY + baselineOffset).lineTo(lineStartXSerial + lineWSerial, rightY + baselineOffset).stroke();
  doc.font('Helvetica');
  doc.text(`${sec.serialRange}`, lineStartXSerial + 5, rightY, { lineBreak: false });

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
    doc.text(formattedCodeText, LEFT_MARGIN, textY, textOptions);
  }
  doc.fillColor('#000'); 
}
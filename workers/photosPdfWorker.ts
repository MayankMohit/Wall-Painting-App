import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { Submission } from '@/lib/models/Submission';

// 4000px is a safe upper bound. It prevents multi-gigabyte PDFs while 
// retaining plenty of quality for standard printer output.
const MAX_DIM = 4000; 

export async function buildPhotosPdf(jobId: string) {
  // 1. THE PAINTER-FIRST SORT (Must match Phase 1 exactly)
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('images') // We need the actual Photo documents for their URLs
    .lean();

  // We set autoFirstPage to false because we want to dynamically size EVERY page, 
  // including the very first one, to perfectly match the photo's dimensions.
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));

  for (const sub of subs) {
    for (const photo of sub.images as any[]) {
      if (!photo.watermarkedUrl) continue;

      try {
        // 2. Fetch the Cloudinary-rendered bytes
        // The URL already contains the #0042 watermark rules we set up yesterday
        const response = await fetch(photo.watermarkedUrl);
        if (!response.ok) throw new Error(`Failed to fetch photo ${photo.generatedNumber}`);
        const arrayBuffer = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);

        // 3. Image Safety Pipeline (EXIF-safe, size-safe)
        const safe = await sharp(buf)
          .rotate() // Crucial: Fixes photos taken sideways on an iPhone
          .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 }) // Normalize format to save PDF weight
          .toBuffer();
          
        const meta = await sharp(safe).metadata();

        // 4. Create a perfectly sized page for this specific image
        doc.addPage({
          size: [meta.width!, meta.height!],
          margin: 0,
        });

        // 5. Fill the entire page edge-to-edge
        doc.image(safe, 0, 0, { width: meta.width, height: meta.height });
        
      } catch (e) {
        console.error(`[Photos PDF Worker] Failed to process image ${photo._id}:`, e);
        // We log and continue. If one photo fails to download, we don't want 
        // to crash the entire 50-page PDF generation.
      }
    }
  }

  doc.end();

  // Wait for the PDFKit stream to finish writing all bytes
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
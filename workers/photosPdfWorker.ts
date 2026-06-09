import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { Submission } from '@/lib/models/Submission';
import { drawPhotoPage } from './layouts/photosPdfLayout';

export async function buildPhotosPdf(jobId: string) {
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('images')
    .lean();

  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));

  for (const sub of subs) {
    for (const photo of sub.images as any[]) {
      const imageUrl = photo.url || photo.secure_url || photo.watermarkedUrl;
      if (!imageUrl) continue;

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch photo ${photo.generatedNumber}`);
        const arrayBuffer = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);

        // Fix EXIF orientation (iPhone photos come in sideways without this)
        let safeBuf = await sharp(buf).rotate().toBuffer();
        let meta = await sharp(safeBuf).metadata();

        // Portrait → rotate anticlockwise 90° so it sits landscape in the PDF
        if ((meta.height ?? 0) > (meta.width ?? 0)) {
          safeBuf = await sharp(safeBuf).rotate(-90).toBuffer();
          meta = await sharp(safeBuf).metadata();
        }

        drawPhotoPage(doc, safeBuf, meta.width || 1, meta.height || 1, photo.generatedNumber);

      } catch (e) {
        console.error(`[Photos PDF Worker] Failed to process image ${photo._id}:`, e);
      }
    }
  }

  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
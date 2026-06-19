import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { Submission } from '@/lib/models/Submission';
import { drawPhotoPage, PHOTO_PAGE_WIDTH_CM } from './layouts/photosPdfLayout';

// Each photo only ever displays at PHOTO_PAGE_WIDTH_CM wide in the PDF, so any
// resolution beyond TARGET_DPI across that width is invisible bytes. Downscaling
// to that size + re-encoding with mozjpeg shrinks the PDF several-fold with no
// perceptible quality loss. Bump TARGET_DPI toward 300 for print-shop output.
const TARGET_DPI = 250;
const JPEG_QUALITY = 88;
const PHOTO_PAGE_WIDTH_IN = PHOTO_PAGE_WIDTH_CM / 2.54;
const TARGET_WIDTH_PX = Math.round(PHOTO_PAGE_WIDTH_IN * TARGET_DPI);

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

        // Downscale to the page's actual display size and re-encode with mozjpeg.
        // withoutEnlargement leaves already-small images untouched. Aspect ratio
        // is preserved, so the layout's width-driven page sizing is unaffected.
        const { data, info } = await sharp(safeBuf)
          .resize({ width: TARGET_WIDTH_PX, withoutEnlargement: true })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' })
          .toBuffer({ resolveWithObject: true });

        drawPhotoPage(doc, data, info.width || 1, info.height || 1, photo.generatedNumber);

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
import PDFDocument from 'pdfkit';
import { Submission } from '@/lib/models/Submission';
import { User } from '@/lib/models/User';
import { drawPdfPage } from './layouts/pdfLayout';

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
  letterhead: { companyName: string; address: string }, 
  excelRows: ExcelRow[] 
) {
  // Save the letterhead as the new default for next time
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

  const groups = new Map<string, { 
    photoNo: number; 
    location: string; 
    sizes: number[][]; 
    codes: string[];
    // Format B Fields
    sizeLabels: string[];
    shopName?: string;
    contactNo?: string;
    vanNo?: string;
    aboveBelow?: string;
  }>();
  
  for (const s of subs) {
    const key = `${s.painterId}_${s.photoNo}`;
    const g = groups.get(key) ?? { 
      photoNo: s.photoNo, 
      location: s.location, 
      sizes: [], 
      codes: [],
      sizeLabels: [],
      shopName: s.shopName,
      contactNo: s.contactNo,
      vanNo: s.vanNo,
      aboveBelow: s.aboveBelow
    };
    
    // Owner-facing PDF uses the owner's size set, falling back to the painter's.
    g.sizes.push(...(s.ownerSizes?.length ? s.ownerSizes : s.sizes));
    if (s.sizeLabels?.length) g.sizeLabels.push(...s.sizeLabels);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Use a tracker so drawPdfPage can track and print the correct page number
  const pageTracker = { count: 1 };

  for (let i = 0; i < sections.length; i += 2) {
    doc.addPage();
    drawPdfPage(doc, letterhead, sections[i], sections[i + 1], pageTracker);
  }

  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
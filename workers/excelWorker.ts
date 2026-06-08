import ExcelJS from 'exceljs';
import { Submission } from '@/lib/models/Submission';
import { buildMasterSheet } from './layouts/excelLayout';

export async function buildExcel(jobId: string, header: { companyName: string; jobName: string; city: string }) {
  // 1. Fetch submissions AND populate the painter's name
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('painterId', 'name')
    .lean();

  const wb = new ExcelJS.Workbook();

  // 2. Delegate to layout builder (Painter looping is removed, only Master List remains)
  const flattenedRows = buildMasterSheet(wb, header, subs);

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    rows: flattenedRows
  };
}
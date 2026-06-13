import ExcelJS from 'exceljs';
import { Submission } from '@/lib/models/Submission';
import { Job } from '@/lib/models/Job';
import { buildMasterSheet } from './layouts/excelLayout';
import { buildPainterSections } from './layouts/painterExcelLayout';

// Shared data fetcher
async function fetchJobData(jobId: string) {
  const jobDoc = await Job.findById(jobId).populate('painters', 'name').lean();
  const actualJobName = jobDoc?.companyName || 'UNKNOWN JOB';
  
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('painterId', 'name')
    .lean();

  return { 
    actualJobName, 
    subs, 
    allPainters: (jobDoc?.painters as any[]) || [] 
  };
}

export async function buildExcel(jobId: string, header: { companyName: string; jobName: string; city: string }) {
  const { actualJobName, subs } = await fetchJobData(jobId);
  const wb = new ExcelJS.Workbook();
  const flattenedRows = buildMasterSheet(wb, { ...header, jobName: actualJobName }, subs);

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), rows: flattenedRows };
}

export async function buildPainterWiseExcel(jobId: string, header: { companyName: string; jobName: string; city: string }) {
  const { actualJobName, subs, allPainters } = await fetchJobData(jobId);
  const wb = new ExcelJS.Workbook();
  
  buildPainterSections(wb, { ...header, jobName: actualJobName }, subs, allPainters);

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
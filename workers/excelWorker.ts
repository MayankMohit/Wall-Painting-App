import ExcelJS from 'exceljs';
import { Submission } from '@/lib/models/Submission';
import { Job } from '@/lib/models/Job';
import { buildMasterSheet } from './layouts/excelLayout';

export async function buildExcel(jobId: string, header: { companyName: string; jobName: string; city: string }) {

  // Fetch the actual Job document from the database
  const jobDoc = await Job.findById(jobId).lean();
  
  // In your schema, the job's title is stored as 'companyName'
  const actualJobName = jobDoc?.companyName || 'UNKNOWN JOB';

  // 1. Fetch submissions AND populate the painter's name
  const subs = await Submission.find({ jobId, status: 'approved' })
    .sort({ painterId: 1, photoNo: 1, submittedAt: 1 })
    .populate('painterId', 'name')
    .lean();

  const wb = new ExcelJS.Workbook();

  const finalHeader = {
    ...header,
    jobName: actualJobName
  };

  // 2. Delegate to layout builder (Painter looping is removed, only Master List remains)
  const flattenedRows = buildMasterSheet(wb, finalHeader, subs);

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    rows: flattenedRows
  };
}
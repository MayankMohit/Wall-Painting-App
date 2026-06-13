import 'dotenv/config';
import { Worker } from 'bullmq';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';

import '@/lib/models/Photo';
import '@/lib/models/User';

import { r2 } from '@/lib/r2';
import { buildExcel, buildPainterWiseExcel } from './excelWorker';
import { buildPhotosPdf } from './photosPdfWorker';
import { buildFilePdf } from './filePdfWorker';

function redisConnection() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const url = new URL(raw);
  const isTls = url.protocol === 'rediss:';
  return {
    host: url.hostname,
    port: Number(url.port) || (isTls ? 6380 : 6379),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    maxRetriesPerRequest: null as unknown as number,
    retryStrategy: (times: number) => Math.min(times * 2_000, 30_000),
  };
}

type Payload = {
  jobId: string;
  fileId: string;
  type: 'excel' | 'excel_painters' | 'pdf_photos' | 'pdf_file';
  ownerId: string;
  ownerInput?: { companyName?: string; jobName?: string; city?: string; address?: string };
};

async function main() {
  await connectDB();
  const connection = redisConnection();

  const worker = new Worker<Payload>(
    'fileGenQueue',
    async (job) => {
      const { jobId, fileId, type, ownerId, ownerInput = {} } = job.data;
      let buffer: Buffer;
      let mime: string;
      let ext: string;

      switch (type) {
        case 'excel': {
          const excel = await buildExcel(jobId, {
            companyName: ownerInput.companyName || '',
            jobName: ownerInput.jobName || '',
            city: ownerInput.city || '',
          });
          buffer = excel.buffer;
          mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          ext = 'xlsx';
          break;
        }
        case 'excel_painters': {
          const excel = await buildPainterWiseExcel(jobId, {
            companyName: ownerInput.companyName || '',
            jobName: ownerInput.jobName || '',
            city: ownerInput.city || '',
          });
          buffer = excel.buffer;
          mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          ext = 'xlsx';
          break;
        }
        case 'pdf_photos': {
          buffer = await buildPhotosPdf(jobId);
          mime = 'application/pdf';
          ext = 'pdf';
          break;
        }
        case 'pdf_file': {
          const excel = await buildExcel(jobId, {
            companyName: ownerInput.companyName || '',
            jobName: ownerInput.jobName || '',
            city: ownerInput.city || '',
          });
          buffer = await buildFilePdf(jobId, ownerId, {
            companyName: ownerInput.companyName || '',
            address: ownerInput.address || '',
          }, excel.rows);
          mime = 'application/pdf';
          ext = 'pdf';
          break;
        }
        default:
          throw new Error(`Unknown file type: ${type}`);
      }

      const r2Path = `exports/${jobId}/${fileId}.${ext}`;
      const r2Url = await r2.upload(r2Path, buffer, mime);

      await GeneratedFile.updateOne({ _id: fileId }, {
        status: 'ready', r2Path, r2Url, fileSize: buffer.length,
      });
    },
    {
      connection,
      concurrency:      2,
      drainDelay:       30, 
      stalledInterval:  60_000, 
      lockDuration:     120_000,
      lockRenewTime:    60_000, 
    }
  );

  worker.on('completed', (job) => console.log(`[fileGenWorker] ${job.name}:${job.id} completed`));
  worker.on('failed', async (job, err) => {
    console.error(`[fileGenWorker] ${job?.name}:${job?.id} failed —`, err.message);
    if (job?.data?.fileId) {
      await GeneratedFile.updateOne({ _id: job.data.fileId }, { status: 'failed' });
    }
  });
  console.log('[fileGenWorker] started, listening on fileGenQueue');

  process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[fileGenWorker] startup error:', err);
  process.exit(1);
});
'use client';

import { useState } from 'react';
import { useGetUploadSignatureMutation } from '@/store/api/endpoints/uploads';
import { compressAndUpload, type UploadedImage } from '@/components/jobs/submission/uploadHelpers';

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const KEY   = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;

// Process at most this many photos at once. Unbounded fan-out (Promise.all over
// every photo) overwhelmed phone memory and tripped Cloudinary's concurrency
// throttling, causing intermittent submission failures.
const MAX_CONCURRENT = 3;

export function usePhotoUpload() {
  const [getSignature] = useGetUploadSignatureMutation();
  const [step, setStep] = useState('');

  async function uploadFiles(files: File[], jobId: string): Promise<UploadedImage[]> {
    setStep('Getting signature…');
    const sig = await getSignature({ folder: `jobs/${jobId}` }).unwrap();
    setStep(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`);

    // Bounded-concurrency map: keep MAX_CONCURRENT uploads in flight, preserving
    // input order in the result so photo metadata stays aligned.
    const results = new Array<UploadedImage>(files.length);
    let next = 0;
    let done = 0;
    async function worker() {
      while (next < files.length) {
        const i = next++;
        results[i] = await compressAndUpload(files[i], sig, KEY, CLOUD);
        done++;
        setStep(`Uploading ${done} of ${files.length} photo${files.length > 1 ? 's' : ''}…`);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT, files.length) }, worker),
    );

    setStep('');
    return results;
  }

  return { uploadFiles, step, setStep };
}

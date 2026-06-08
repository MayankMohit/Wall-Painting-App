'use client';

import { useState } from 'react';
import { useGetUploadSignatureMutation } from '@/store/api/endpoints/uploads';
import { compressAndUpload, type UploadedImage } from '@/components/jobs/submission/uploadHelpers';

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const KEY   = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;

export function usePhotoUpload() {
  const [getSignature] = useGetUploadSignatureMutation();
  const [step, setStep] = useState('');

  async function uploadFiles(files: File[], jobId: string): Promise<UploadedImage[]> {
    setStep('Getting signature…');
    const sig = await getSignature({ folder: `jobs/${jobId}` }).unwrap();
    setStep(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
    const images = await Promise.all(files.map((f) => compressAndUpload(f, sig, KEY, CLOUD)));
    setStep('');
    return images;
  }

  return { uploadFiles, step, setStep };
}

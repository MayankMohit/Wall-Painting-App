'use client';

import { useState, use } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

export default function SubmitPhotosPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;
  const router = useRouter();

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      location: '',
      photoNo: '',
      sizes: [{ width: '', height: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const uploadToCloudinary = async (file: File, signature: any, apiKey: string, folder: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature.signature);
    formData.append('timestamp', signature.timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return res.json();
  };

  const onSubmit = async (data: any) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Please select at least one photo to upload.");
      return;
    }

    setIsUploading(true);
    setUploadStatus('Step 1/3: Getting secure signature...');

    try {
      const token = localStorage.getItem('wallpainter_token');
      if (!token) throw new Error('Authentication token missing.');

      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: `jobs/${jobId}` }) 
      });
      
      if (!signRes.ok) throw new Error('Failed to get upload signature');
      const signData = await signRes.json();
      const payload = signData.data || signData; 
      
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
      if (!apiKey) throw new Error("Cloudinary API Key missing.");

      setUploadStatus('Step 2/3: Compressing & Uploading photos...');
      
      const uploadedImagesData = await Promise.all(Array.from(selectedFiles).map(async (originalFile) => {
        // 1. Print-Ready (Max 2MB, high detail for physical prints)
        const printFile = await imageCompression(originalFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2000,
          initialQuality: 0.85
        });

        // 2. Web-Preview (High compression, low bandwidth, instant loading)
        const previewFile = await imageCompression(originalFile, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 800,
          initialQuality: 0.6
        });

        const [printRes, previewRes] = await Promise.all([
          uploadToCloudinary(printFile, payload, apiKey, payload.folder),
          uploadToCloudinary(previewFile, payload, apiKey, payload.folder)
        ]);

        return {
          cloudinaryId: printRes.public_id,
          cloudinaryUrl: printRes.secure_url,
          previewCloudinaryId: previewRes.public_id,
          previewCloudinaryUrl: previewRes.secure_url
        };
      }));

      setUploadStatus('Step 3/3: Saving submission to database...');
      
      const dbPayload = {
        photoNo: Number(data.photoNo),
        location: data.location,
        sizes: data.sizes.map((s: any) => [Number(s.width), Number(s.height)]),
        uploadedImages: uploadedImagesData 
      };

      const dbRes = await fetch(`/api/jobs/${jobId}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dbPayload)
      });

      if (!dbRes.ok) throw new Error('Failed to save to database');

      alert('Success! Photos submitted.');
      router.push(`/painter/jobs/${jobId}`);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Upload failed.");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200 mt-8">
      <div className="mb-8 flex justify-between items-center border-b pb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">New Submission</h2>
        </div>
        <Link href={`/painter/jobs/${jobId}`} className="text-gray-400 hover:text-gray-900 font-bold text-sm">Cancel</Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input {...register('location', { required: true })} placeholder="Location (e.g. Lobby Wall)" className="w-full text-gray-700 rounded-xl border-2 border-gray-200 p-4 font-bold" disabled={isUploading} />
          <input {...register('photoNo', { required: true, valueAsNumber: true })} type="number" placeholder="Photo No." className="w-full rounded-xl border-2 border-gray-200 text-gray-700 p-4 font-bold" disabled={isUploading} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="font-bold text-gray-900">Wall Dimensions (ft)</label>
            <button type="button" onClick={() => append({ width: '', height: '' })} className="text-xs font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-full"> + Add Size </button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4">
              <input {...register(`sizes.${index}.width` as const, { required: true, valueAsNumber: true })} type="number" step="any" placeholder="Width" className="flex-1 rounded-xl text-gray-700 border border-gray-300 p-3" disabled={isUploading} />
              <input {...register(`sizes.${index}.height` as const, { required: true, valueAsNumber: true })} type="number" step="any" placeholder="Height" className="flex-1 rounded-xl text-gray-700 border border-gray-300 p-3" disabled={isUploading} />
              {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-red-400">✕</button>}
            </div>
          ))}
        </div>

        <div className="border-2 border-dashed border-gray-300 text-gray-700 rounded-2xl p-8 flex flex-col items-center text-center">
           <input type="file" multiple accept="image/*" onChange={(e) => setSelectedFiles(e.target.files)} disabled={isUploading} className="block w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:font-black file:bg-indigo-600 file:text-white" />
        </div>

        <button type="submit" disabled={isUploading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-lg hover:bg-black transition-all">
          {isUploading ? uploadStatus : 'Submit Photos'}
        </button>
      </form>
    </div>
  );
}
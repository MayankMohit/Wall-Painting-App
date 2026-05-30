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
  
  // 1. Setup Form with default values for our dynamic sizes array
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      location: '',
      photoNo: '',
      sizes: [{ width: '', height: '' }]
    }
  });

  // 2. Setup Field Array for dynamic adding/removing
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sizes"
  });
  
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

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

      // ---------------------------------------------------------
      // Step 1: Get Cloudinary Signature
      // ---------------------------------------------------------
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder: `jobs/${jobId}` }) 
      });
      
      if (!signRes.ok) throw new Error('Failed to get upload signature');
      const signData = await signRes.json();
      const payload = signData.data || signData; 
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

      if (!cloudName || !apiKey) {
        throw new Error("Cloudinary environment variables are missing.");
      }

      // ---------------------------------------------------------
      // Step 2: Compress & Upload Files directly to Cloudinary
      // ---------------------------------------------------------
      setUploadStatus('Step 2/3: Compressing & Uploading photos...');
      
      const uploadedImagesData: { cloudinaryId: string, cloudinaryUrl: string }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const originalFile = selectedFiles[i];
        
        // --- PRINT-SAFE COMPRESSION ---
        const options = {
          maxSizeMB: 2,             // Max 2MB file size (fast upload)
          maxWidthOrHeight: 2000,   // Perfect for 4x5 prints at 300+ DPI
          useWebWorker: true,
          initialQuality: 0.85      // Keeps sharpness, removes invisible data
        };
        
        const compressedFile = await imageCompression(originalFile, options);
        // ------------------------------

        const formData = new FormData();
        formData.append('file', compressedFile); // Upload the compressed file!
        formData.append('signature', payload.signature);
        formData.append('timestamp', payload.timestamp.toString());
        formData.append('api_key', apiKey);
        
        if (payload.folder) formData.append('folder', payload.folder);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!cloudinaryRes.ok) throw new Error(`Failed to upload image ${i + 1}`);
        
        const cloudinaryData = await cloudinaryRes.json();
        
        uploadedImagesData.push({
          cloudinaryId: cloudinaryData.public_id,
          cloudinaryUrl: cloudinaryData.secure_url
        });
      }

      // ---------------------------------------------------------
      // Step 3: Create Submission in our Database
      // ---------------------------------------------------------
      setUploadStatus('Step 3/3: Saving submission to database...');
      
      // Transform form data [{width: 10, height: 12}] into backend format [[10, 12]]
      const formattedSizes = data.sizes.map((s: any) => [Number(s.width), Number(s.height)]);

      const dbPayload = {
        photoNo: Number(data.photoNo),
        location: data.location,
        sizes: formattedSizes, 
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

      if (!dbRes.ok) {
        const errData = await dbRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to save submission to database');
      }

      alert('Success! Your photos have been submitted for review.');
      router.push(`/painter/jobs/${jobId}`);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong with the upload.");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Wall Submission</h2>
          <p className="text-gray-500">Uploading photos for Job ID: {jobId}</p>
        </div>
        <Link href={`/painter/jobs/${jobId}`} className="text-gray-500 hover:text-gray-800 text-sm font-medium">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            {...register('location', { required: true })}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-50"
            placeholder="e.g. Main Lobby East Wall"
            disabled={isUploading}
          />
          {errors.location && <span className="text-xs text-red-500">Location is required</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Photo Number</label>
          <input
            {...register('photoNo', { required: true, min: 1, valueAsNumber: true })}
            type="number"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-50"
            placeholder="e.g. 1"
            disabled={isUploading}
          />
          {errors.photoNo && <span className="text-xs text-red-500">A valid photo number is required</span>}
        </div>

        {/* Dynamic Dimensions Area */}
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Wall Dimensions</label>
            <button 
              type="button" 
              onClick={() => append({ width: '', height: '' })}
              disabled={isUploading}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
            >
              + Add Another Size
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start relative">
              <div className="flex-1">
                <input
                  // Changed min to 0.1 to allow small decimal measurements
                  {...register(`sizes.${index}.width` as const, { required: true, min: 0.1, valueAsNumber: true })}
                  type="number"
                  step="any" // <-- ALLOWS DECIMALS
                  className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-50"
                  placeholder="Width (ft)"
                  disabled={isUploading}
                />
              </div>
              <div className="flex-1">
                <input
                  // Changed min to 0.1 to allow small decimal measurements
                  {...register(`sizes.${index}.height` as const, { required: true, min: 0.1, valueAsNumber: true })}
                  type="number"
                  step="any" // <-- ALLOWS DECIMALS
                  className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-50"
                  placeholder="Height (ft)"
                  disabled={isUploading}
                />
              </div>
              
              {/* Only show Remove button if there's more than one row */}
              {fields.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => remove(index)}
                  disabled={isUploading}
                  className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors shrink-0"
                  title="Remove size"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              )}
            </div>
          ))}
          {errors.sizes && <span className="text-xs text-red-500">Please fill out all size fields correctly.</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Wall Photos (Multi-angle)</label>
          <div className={`border-2 border-dashed rounded-md p-6 flex flex-col justify-center items-center transition-colors ${isUploading ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-300 hover:bg-blue-100'}`}>
             <input 
               type="file" 
               multiple 
               accept="image/*"
               onChange={(e) => setSelectedFiles(e.target.files)}
               className="text-gray-600 w-full cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
               disabled={isUploading}
             />
             {selectedFiles && selectedFiles.length > 0 && (
               <p className="mt-3 text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                 {selectedFiles.length} file(s) selected ready for upload.
               </p>
             )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Please upload before, during, and after angles to ensure approval.</p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isUploading}
            className={`w-full text-white rounded-md py-3 px-4 font-bold transition-colors ${
              isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></span>
                {uploadStatus}
              </span>
            ) : (
              'Submit Photos for Approval'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
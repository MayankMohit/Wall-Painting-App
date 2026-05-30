'use client';

import { useState, useEffect, use } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

interface ExistingPhoto {
  _id: string;
  cloudinaryUrl: string;
}

export default function EditSubmissionPage({ params }: { params: Promise<{ jobId: string, id: string }> }) {
  const resolvedParams = use(params);
  const { jobId, id: submissionId } = resolvedParams;
  
  const router = useRouter();
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      location: '',
      sizes: [{ width: '', height: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sizes"
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // 1. Fetch Existing Submission
  useEffect(() => {
    let isMounted = true;

    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch submission details');
        
        const json = await res.json();
        const data = json?.data || json;

        if (isMounted) {
          setSubmissionData(data);
          setExistingPhotos(data.images || []);
          
          // Map backend sizes [[w,h]] to react-hook-form format [{width, height}]
          const mappedSizes = data.sizes?.map((s: number[]) => ({
            width: s[0].toString(),
            height: s[1].toString()
          })) || [{ width: '', height: '' }];

          // Reset form with fetched data
          reset({
            location: data.location,
            sizes: mappedSizes
          });
          
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchSubmission();
    return () => { isMounted = false; };
  }, [jobId, submissionId, reset]);

  // 2. Delete Individual Photo (Hitting your specific DELETE route)
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete photo');

      // Optimistically remove from UI
      setExistingPhotos(prev => prev.filter(p => p._id !== photoId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 3. Handle Form Submit (Update text, optionally upload new photos)
  const onSubmit = async (data: any) => {
    setIsUploading(true);
    setUploadStatus('Saving updates...');

    try {
      const token = localStorage.getItem('wallpainter_token');
      const uploadedImagesData: { cloudinaryId: string, cloudinaryUrl: string }[] = [];

      // Only run Cloudinary upload if NEW files were selected
      if (selectedFiles && selectedFiles.length > 0) {
        setUploadStatus('Step 1/3: Getting secure signature...');
        
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

        setUploadStatus('Step 2/3: Compressing & Uploading new photos...');
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const originalFile = selectedFiles[i];
          
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
            initialQuality: 0.85
          };
          
          const compressedFile = await imageCompression(originalFile, options);

          const formData = new FormData();
          formData.append('file', compressedFile);
          formData.append('signature', payload.signature);
          formData.append('timestamp', payload.timestamp.toString());
          formData.append('api_key', apiKey as string);
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
      }

      setUploadStatus(uploadedImagesData.length > 0 ? 'Step 3/3: Saving to database...' : 'Saving updates...');

      // Format sizes back to backend [[w, h]] array
      const formattedSizes = data.sizes.map((s: any) => [Number(s.width), Number(s.height)]);

      const dbPayload = {
        location: data.location,
        sizes: formattedSizes,
        uploadedImages: uploadedImagesData // Will be empty if no new photos, which backend handles fine
      };

      const dbRes = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dbPayload)
      });

      if (!dbRes.ok) throw new Error('Failed to update submission in database');

      alert('Success! Submission updated.');
      router.push(`/painter/jobs/${jobId}`);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong with the update.");
      setIsUploading(false);
    }
  };

  if (isLoading) return <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>;
  if (submissionData?.status === 'approved') return <div className="p-10 text-center font-bold text-gray-700">This submission is already approved and cannot be edited.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {submissionData.status === 'rejected' ? 'Fix & Resubmit' : 'Edit Submission'}
          </h2>
          <p className="text-gray-500">Photo #{submissionData.photoNo}</p>
        </div>
        <Link href={`/painter/jobs/${jobId}`} className="text-gray-500 hover:text-gray-800 text-sm font-medium">
          Cancel
        </Link>
      </div>

      {/* Rejection Note */}
      {submissionData.status === 'rejected' && submissionData.rejectionReason && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
          <h3 className="text-red-800 font-bold text-sm">Owner Feedback:</h3>
          <p className="text-red-700 text-sm mt-1">{submissionData.rejectionReason}</p>
        </div>
      )}

      {/* Existing Photos Grid */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-900 mb-3">Current Photos</label>
        {existingPhotos.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No photos attached. Please upload new ones.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingPhotos.map(photo => (
              <div key={photo._id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.cloudinaryUrl} alt="Wall" className="object-cover w-full h-full" />
                <button 
                  type="button"
                  onClick={() => handleDeletePhoto(photo._id)}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm"
                >
                  Delete Photo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 border-t border-gray-100 pt-6">
        
        {/* Location Update */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Update Location</label>
          <input
            {...register('location', { required: true })}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 outline-none disabled:bg-gray-50"
            disabled={isUploading}
          />
          {errors.location && <span className="text-xs text-red-500">Location is required</span>}
        </div>

        {/* Sizes Update (Same as 'new' page) */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Update Dimensions</label>
            <button 
              type="button" 
              onClick={() => append({ width: '', height: '' })}
              disabled={isUploading}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md"
            >
              + Add Size
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  {...register(`sizes.${index}.width` as const, { required: true, min: 0.1, valueAsNumber: true })}
                  type="number" step="any" placeholder="Width" disabled={isUploading}
                  className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 outline-none"
                />
              </div>
              <div className="flex-1">
                <input
                  {...register(`sizes.${index}.height` as const, { required: true, min: 0.1, valueAsNumber: true })}
                  type="number" step="any" placeholder="Height" disabled={isUploading}
                  className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 outline-none"
                />
              </div>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)} disabled={isUploading} className="p-3 text-red-500 hover:bg-red-50 rounded-md">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add NEW Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Add Additional Photos (Optional)</label>
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-md p-6 flex flex-col justify-center items-center mt-1">
             <input 
               type="file" multiple accept="image/*" disabled={isUploading} 
               onChange={(e) => setSelectedFiles(e.target.files)}
               className="text-gray-600 text-sm" 
             />
             {selectedFiles && selectedFiles.length > 0 && (
               <p className="mt-3 text-xs font-bold text-blue-700">{selectedFiles.length} new file(s) selected.</p>
             )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            disabled={isUploading}
            className={`w-full text-white rounded-md py-3 px-4 font-bold transition-colors ${
              isUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? uploadStatus : 'Save & Resubmit'}
          </button>

        </div>

      </form>
    </div>
  );
}
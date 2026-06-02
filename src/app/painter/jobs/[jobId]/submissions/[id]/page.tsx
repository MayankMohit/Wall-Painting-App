'use client';

import { useState, useEffect, use } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

interface ExistingPhoto {
  _id: string;
  cloudinaryUrl: string;
  previewCloudinaryUrl: string;
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ jobId: string, id: string }> }) {
  const resolvedParams = use(params);
  const { jobId, id: submissionId } = resolvedParams;
  const router = useRouter();

  // --- UI States ---
  const [isEditing, setIsEditing] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // --- Data States ---
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // --- Form Setup ---
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      location: '',
      photoNo: '',
      sizes: [{ width: '', height: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  
  // Watch sizes to calculate total area in real-time
  const watchedSizes = watch('sizes');
  const calculateTotalArea = (sizesArr: any[]) => {
    return sizesArr.reduce((total, size) => {
      const w = Number(size.width) || 0;
      const h = Number(size.height) || 0;
      return total + (w * h);
    }, 0).toFixed(1);
  };

  // --- 1. Fetch Data ---
  useEffect(() => {
    let isMounted = true;
    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch details');
        
        const json = await res.json();
        const data = json?.data || json;

        if (isMounted) {
          setSubmissionData(data);
          setExistingPhotos(data.images || []);
          
          const mappedSizes = data.sizes?.map((s: number[]) => ({
            width: s[0].toString(), height: s[1].toString()
          })) || [{ width: '', height: '' }];

          reset({ location: data.location, photoNo: data.photoNo?.toString(), sizes: mappedSizes });
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) { setError(err.message); setIsLoading(false); }
      }
    };
    fetchSubmission();
    return () => { isMounted = false; };
  }, [jobId, submissionId, reset]);

  // --- 2. Delete Photo ---
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo permanently?')) return;
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}/photos/${photoId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete photo');
      
      setExistingPhotos(prev => prev.filter(p => p._id !== photoId));
      if (activePhotoIndex >= existingPhotos.length - 1) setActivePhotoIndex(0);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- 3. Cloudinary Upload Helper ---
  const uploadToCloudinary = async (file: File, signature: any, apiKey: string, folder: string, cloudName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature.signature);
    formData.append('timestamp', signature.timestamp.toString());
    formData.append('api_key', apiKey);
    if (folder) formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  };

  // --- 4. Submit Edits ---
  const onSubmit = async (data: any) => {
    setIsUploading(true);
    setUploadStatus('Saving updates...');

    try {
      const token = localStorage.getItem('wallpainter_token');
      let uploadedImagesData: any[] = []; 

      if (selectedFiles && selectedFiles.length > 0) {
        setUploadStatus('Step 1/3: Getting signature...');
        const signRes = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: `jobs/${jobId}` }) 
        });
        if (!signRes.ok) throw new Error('Signature failed');
        const payload = (await signRes.json()).data || await signRes.json(); 
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
        const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;

        setUploadStatus('Step 2/3: Compressing & Uploading...');
        
        uploadedImagesData = await Promise.all(Array.from(selectedFiles).map(async (originalFile) => {
          const printFile = await imageCompression(originalFile, { maxSizeMB: 2, maxWidthOrHeight: 2000, initialQuality: 0.85 });
          const previewFile = await imageCompression(originalFile, { maxSizeMB: 0.3, maxWidthOrHeight: 800, initialQuality: 0.6 });
          const [printRes, previewRes] = await Promise.all([
            uploadToCloudinary(printFile, payload, apiKey, payload.folder, cloudName),
            uploadToCloudinary(previewFile, payload, apiKey, payload.folder, cloudName)
          ]);
          return {
            cloudinaryId: printRes.public_id, cloudinaryUrl: printRes.secure_url,
            previewCloudinaryId: previewRes.public_id, previewCloudinaryUrl: previewRes.secure_url
          };
        }));
      }

      setUploadStatus('Step 3/3: Saving to database...');
      const dbPayload = {
        location: data.location,
        photoNo: Number(data.photoNo),
        sizes: data.sizes.map((s: any) => [Number(s.width), Number(s.height)]),
        uploadedImages: uploadedImagesData 
      };

      const dbRes = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dbPayload)
      });
      if (!dbRes.ok) throw new Error('Database update failed');

      alert('Success! Submission updated.');
      window.location.reload(); // Quick refresh to show new data in View mode

    } catch (error: any) {
      alert(error.message);
      setIsUploading(false);
    }
  };

  if (isLoading) return <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>;

  const totalArea = calculateTotalArea(isEditing ? watchedSizes : submissionData.sizes.map((s:any)=>({width:s[0], height:s[1]})));
  
  // ==========================================
  // RENDER: VIEW MODE (Screenshot 1)
  // ==========================================
  if (!isEditing) {
    return (
      <div className="max-w-3xl mx-auto bg-[#fafafa] min-h-screen pb-24">
        {/* Header Options */}
        <div className="flex justify-between items-center p-6">
          <Link href={`/painter/jobs/${jobId}`} className="text-gray-900 hover:bg-gray-200 p-2 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </Link>
          
        </div>

        <div className="px-6 space-y-6">
          {/* Gallery Area */}
          <div>
            <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden mb-3 relative">
              {existingPhotos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={existingPhotos[activePhotoIndex].previewCloudinaryUrl || existingPhotos[activePhotoIndex].cloudinaryUrl} alt="Main Wall" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-mono text-sm bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#e5e7eb_10px,#e5e7eb_20px)]">NO PHOTOS</div>
              )}
            </div>
            
            {existingPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {existingPhotos.map((photo, idx) => (
                  <button key={photo._id} onClick={() => setActivePhotoIndex(idx)} className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activePhotoIndex === idx ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewCloudinaryUrl || photo.cloudinaryUrl} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-gray-500 font-mono">#{submissionData._id?.slice(-6)}</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${submissionData.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : submissionData.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-[#EFECE6] text-[#8C8471]'}`}>
                • {submissionData.status} REVIEW
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{submissionData.location}</h1>
            <p className="text-sm text-gray-500 mt-1">Submitted {new Date(submissionData.submittedAt).toLocaleDateString()} · {new Date(submissionData.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>

          {/* Wall Sizes Card */}
          <div className="bg-[#f4f4f2] rounded-3xl p-6">
            <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase mb-4">Wall Sizes</h3>
            <div className="space-y-4">
              {submissionData.sizes.map((s: number[], i: number) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-400">{(i+1).toString().padStart(2, '0')}</span>
                    <span className="text-lg font-bold text-gray-900">{s[0]} <span className="text-gray-400 font-normal mx-1">×</span> {s[1]} <span className="text-gray-500 font-medium text-sm ml-1">ft</span></span>
                  </div>
                  <span className="text-sm font-bold text-gray-400 font-mono">{(s[0] * s[1]).toFixed(1)} ft²</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-gray-600">Total area</span>
                <span className="text-2xl font-black text-gray-900 font-mono">{totalArea} <span className="text-lg">ft²</span></span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Photo Number</h3>
              <p className="text-3xl font-black text-gray-900">{submissionData.photoNo.toString().padStart(2, '0')}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Photos</h3>
              <p className="text-3xl font-black text-gray-900">{existingPhotos.length}</p>
            </div>
          </div>
        </div>

        {/* Floating Edit Button */}
        {submissionData.status !== 'approved' && (
          <div className="fixed bottom-6 left-0 right-0 px-6 max-w-3xl mx-auto z-10">
            <button onClick={() => setIsEditing(true)} className="w-full bg-[#1c1b19] text-white py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-2xl hover:bg-black transition-transform active:scale-[0.98]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              Edit submission
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: EDIT MODE (Screenshot 2)
  // ==========================================
  return (
    <div className="max-w-3xl mx-auto bg-white min-h-screen pb-24 p-6">
      
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-black text-gray-900">Edit Submission</h2>
        <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-900 font-bold text-sm">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Wall Location */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">Wall location</label>
          <input {...register('location', { required: true })} className="w-full rounded-2xl border-2 border-gray-200 p-4 text-gray-900 font-medium focus:border-black outline-none" disabled={isUploading} />
          <p className="text-xs text-gray-500 mt-2">Where is this wall on the job site? Be specific.</p>
        </div>

        {/* Dynamic Wall Sizes */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">Wall sizes <span className="text-gray-400 font-normal">· at least one</span></label>
          <div className="space-y-3 mt-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-center">
                <span className="text-sm font-mono font-bold text-gray-400 w-6">{(index+1).toString().padStart(2, '0')}</span>
                
                <div className="flex-1 relative">
                  <input {...register(`sizes.${index}.width` as const, { required: true, valueAsNumber: true })} type="number" step="any" className="w-full rounded-2xl border-2 border-gray-200 p-4 font-bold text-gray-900 outline-none" disabled={isUploading} />
                  <span className="absolute right-4 top-4 text-gray-400 text-sm">ft · length</span>
                </div>
                
                <div className="flex-1 relative">
                  <input {...register(`sizes.${index}.height` as const, { required: true, valueAsNumber: true })} type="number" step="any" className="w-full rounded-2xl border-2 border-gray-200 p-4 font-bold text-gray-900 outline-none" disabled={isUploading} />
                  <span className="absolute right-4 top-4 text-gray-400 text-sm">ft · height</span>
                </div>
                
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition">✕</button>
                )}
              </div>
            ))}
            
            <button type="button" onClick={() => append({ width: '', height: '' })} className="w-full mt-2 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-600 flex justify-center items-center gap-2 hover:bg-gray-50 transition">
              <span className="text-[#EA580C] text-lg leading-none">+</span> Add another size
            </button>
          </div>
          
          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-gray-500">Total area auto-calculated</span>
            <span className="font-mono font-bold text-gray-900">= {totalArea} ft²</span>
          </div>
        </div>

        {/* Photo Number */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">Photo number</label>
          <div className="relative">
            <input {...register('photoNo', { required: true })} type="number" className="w-full rounded-2xl border-2 border-gray-200 p-4 font-bold text-gray-900 outline-none" disabled={isUploading} />
            <span className="absolute right-4 top-4 text-gray-400 text-sm">of submission</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Sequence number for this submission's photos.</p>
        </div>

        {/* Photos Grid */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">Photos <span className="text-gray-400 font-normal">· {existingPhotos.length + (selectedFiles?.length || 0)} of 20</span></label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            
            {/* Pick Button */}
            <label className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-gray-50 transition">
              <svg className="w-6 h-6 text-[#EA580C] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span className="text-xs font-bold text-gray-600">Pick</span>
              <input type="file" multiple accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => setSelectedFiles(e.target.files)} />
            </label>

            {/* Existing Photos */}
            {existingPhotos.map(photo => (
              <div key={photo._id} className="relative rounded-2xl overflow-hidden aspect-square border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewCloudinaryUrl || photo.cloudinaryUrl} alt="Wall" className="w-full h-full object-cover" />
                <button type="button" onClick={() => handleDeletePhoto(photo._id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}

            {/* New Selection Placeholders */}
            {selectedFiles && Array.from(selectedFiles).map((file, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden aspect-square border-2 border-[#EA580C] bg-orange-50 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#EA580C]">NEW</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Pick photos from your gallery · max 20 per submission.</p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button type="submit" disabled={isUploading} className="w-full bg-[#1c1b19] text-white py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-transform active:scale-[0.98]">
            {isUploading ? uploadStatus : 'Submit'}
            {!isUploading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>}
          </button>
        </div>
      </form>
    </div>
  );
}
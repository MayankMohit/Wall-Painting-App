'use client';

import { useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubmitPhotosPage({ params }: { params: Promise<{ jobId: string }> }) {

  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const router = useRouter();
  const { register, handleSubmit } = useForm();
  
  // State to hold the files the user selects
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const onSubmit = async (data: any) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Please select at least one photo to upload.");
      return;
    }

    setIsUploading(true);

    try {
      // ---------------------------------------------------------
      // THIS MATCHES YOUR WORKFLOW IMAGE EXACTLY
      // ---------------------------------------------------------
      
      // Step 5: Sign Upload
      setUploadStatus('Step 1/3: Getting secure signature...');
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay
      
      // Step 6: Direct Upload to Cloudinary
      setUploadStatus('Step 2/3: Uploading photos to Cloudinary...');
      await new Promise(resolve => setTimeout(resolve, 1200)); // Fake delay
      
      // Step 7: Create Submission in our Database
      setUploadStatus('Step 3/3: Saving submission to database...');
      console.log(`Submitting to /api/jobs/${jobId}/submissions`, {
        ...data,
        images: ["fake_cloudinary_url_1", "fake_cloudinary_url_2"]
      });
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay

      // Success! Route back to the job details page
      alert('Success! Your photos have been submitted for review.');
      router.push(`/painter/jobs/${jobId}`);

    } catch (error) {
      alert("Something went wrong with the upload.");
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

        {/* Step 7 Data: Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            {...register('location')}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none"
            placeholder="xyz Building, City"
            required
            disabled={isUploading}
          />
        </div>

        {/* Step 7 Data: Photo Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Photo Number</label>
          <input
            {...register('photoNo')}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none"
            placeholder="e.g. Wall A-12"
            required
            disabled={isUploading}
          />
        </div>

        {/* Step 7 Data: Dimensions */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Size</label>
          <input
            {...register('paintingSize')}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none"
            placeholder="e.g. 10x12 ft"
            required
            disabled={isUploading}
          />
        </div>

        {/* Multi-Angle Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Wall Photos (Multi-angle)</label>
          <div className={`border-2 border-dashed rounded-md p-6 flex flex-col justify-center items-center ${isUploading ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-300'}`}>
             <input 
               type="file" 
               multiple 
               accept="image/*"
               onChange={(e) => setSelectedFiles(e.target.files)}
               className="text-gray-600 w-full cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
               disabled={isUploading}
             />
             {selectedFiles && (
               <p className="mt-3 text-sm font-medium text-blue-700">
                 {selectedFiles.length} file(s) selected ready for upload.
               </p>
             )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Please upload before, during, and after angles to ensure approval.</p>
        </div>

        {/* Submit Button & Loading State */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isUploading}
            className={`w-full text-white rounded-md py-3 px-4 font-bold transition-colors ${
              isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
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
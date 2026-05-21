'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditSubmissionPage({ params }: { params: Promise<{ jobId: string, id: string }> }) {
  const resolvedParams = use(params);
  const { jobId, id: submissionId } = resolvedParams;
  
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [submission, setSubmission] = useState<any>(null);

  // 1. Simulate fetching the specific submission data
  useEffect(() => {
    let isMounted = true; // Safety flag

    const fetchSubmission = async () => {
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/submissions/:id
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isMounted) {
        // Dummy data response
        setSubmission({
          photoNo: 'Wall A-12',
          paintingSize: '10x12 ft',
          status: 'rejected',
          feedback: 'Lighting is too dark, please re-take the after photo.', // Owner feedback
        });
      }
    };

    fetchSubmission();

    return () => {
      isMounted = false; // Cleanup
    };
  }, [submissionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: 
      // When the backend API gets done, we can test it right here.
      // e.g., await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, { method: 'PUT', body: ... })
      // ---------------------------------------------------------
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate PUT request
      
      alert('Success! Submission updated and sent back for review.');
      router.push(`/painter/jobs/${jobId}`);
    } catch (error) {
      alert("Something went wrong with the update.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!submission) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading submission details...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {submission.status === 'rejected' ? 'Fix & Resubmit' : 'Edit Submission'}
          </h2>
          <p className="text-gray-500">Updating Photo ID: {submissionId}</p>
        </div>
        <Link href={`/painter/jobs/${jobId}`} className="text-gray-500 hover:text-gray-800 text-sm font-medium">
          Cancel
        </Link>
      </div>

      {submission.status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
          <h3 className="text-red-800 font-bold text-sm">Owner Feedback:</h3>
          <p className="text-red-700 text-sm mt-1">{submission.feedback}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Photo / Wall Number</label>
          <input
            type="text"
            defaultValue={submission.photoNo}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 outline-none"
            required
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Upload New Wall Photos</label>
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-md p-6 flex justify-center items-center mt-1">
             <input type="file" multiple accept="image/*" disabled={isUploading} className="text-sm" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className={`w-full text-white rounded-md py-3 px-4 font-bold transition-colors ${
            isUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Updating Database...' : 'Save & Resubmit'}
        </button>
      </form>
    </div>
  );
}
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReviewSubmissionPage({ params }: { params: Promise<{ jobId: string, id: string }> }) {
  const resolvedParams = use(params);
  const { jobId, id: submissionId } = resolvedParams;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/submissions/:id
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isMounted) {
        setSubmission({
          photoNo: 'Wall A-12',
          painterName: 'Alex Johnson',
          size: '10x12 ft',
          status: 'pending',
          submittedAt: '2 hours ago',
          // Dummy Cloudinary Images
          images: [
            'https://placehold.co/600x400/eeeeee/999999?text=Before+Prep',
            'https://placehold.co/600x400/dddddd/666666?text=During+Painting',
            'https://placehold.co/600x400/bbbbbb/333333?text=Final+Result'
          ]
        });
        setIsLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [submissionId]);

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !feedback.trim()) {
      alert("Please provide a reason for the rejection.");
      return;
    }

    setIsProcessing(true);
    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: PUT /api/jobs/:jobId/submissions/:id
      // Payload: { status: action, feedback: feedback }
      // ---------------------------------------------------------
      console.log(`Submitting ${action} with feedback:`, feedback);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Submission successfully ${action}!`);
      router.push(`/owner/jobs/${jobId}/submissions`);
    } catch (error) {
      alert("Action failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-gray-500 animate-pulse">Loading photos...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review: {submission?.photoNo}</h2>
          <p className="text-gray-500 mt-1">Submitted by <span className="font-medium text-gray-700">{submission?.painterName}</span> • {submission?.size}</p>
        </div>
        <Link href={`/owner/jobs/${jobId}/submissions`} className="text-gray-500 hover:text-gray-800 text-sm font-medium">
          Cancel & Go Back
        </Link>
      </div>

      {/* Photo Gallery (Mocked) */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Uploaded Angles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {submission?.images.map((img: string, idx: number) => (
            <div key={idx} className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer" />
            </div>
          ))}
        </div>
      </div>

      {/* Review Actions */}
      {submission?.status === 'pending' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
          
          {!showRejectForm ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleAction('approved')}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                {isProcessing ? 'Saving...' : 'Approve Submission'}
              </button>
              <button 
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="flex-1 bg-white text-red-600 border-2 border-red-200 py-3 px-4 rounded-lg font-bold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                Reject & Request Changes
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
              <h3 className="text-red-700 font-bold">Request Changes</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what the painter needs to fix (e.g., 'Lighting is too dark on the final photo, please re-take')."
                className="w-full border-2 border-red-200 rounded-lg p-3 text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 min-h-[100px]"
                disabled={isProcessing}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction('rejected')}
                  disabled={isProcessing || !feedback.trim()}
                  className="bg-red-600 text-white py-2 px-6 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Sending...' : 'Confirm Rejection'}
                </button>
                <button 
                  onClick={() => { setShowRejectForm(false); setFeedback(''); }}
                  disabled={isProcessing}
                  className="text-gray-500 font-bold hover:text-gray-800 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
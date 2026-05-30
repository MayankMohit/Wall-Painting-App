'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Photo {
  _id: string;
  cloudinaryUrl: string;
}

export default function ReviewSubmissionPage({ params }: { params: Promise<{ jobId: string, id: string }> }) {
  const resolvedParams = use(params);
  const { jobId, id: submissionId } = resolvedParams;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  // Editing states (Location & Sizes)
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editSizes, setEditSizes] = useState<{width: string, height: string}[]>([]);

  // Selection & Viewing states
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load submission details');
        
        const json = await res.json();
        const data = json?.data || json;

        if (isMounted) {
          setSubmission(data);
          
          if (data.images && data.images.length > 0) {
            setSelectedImageIds(data.images.map((img: Photo) => img._id));
          }

          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };
    
    fetchDetails();
    return () => { isMounted = false; };
  }, [jobId, submissionId]);

  // --- EDIT DETAILS LOGIC ---
  const handleStartEditing = () => {
    setEditLocation(submission.location);
    // Convert backend [[w, h]] format to frontend state array
    setEditSizes(submission.sizes.map((s: number[]) => ({ width: s[0].toString(), height: s[1].toString() })));
    setIsEditingDetails(true);
  };

  const handleUpdateSize = (index: number, field: 'width' | 'height', value: string) => {
    const newSizes = [...editSizes];
    newSizes[index][field] = value;
    setEditSizes(newSizes);
  };

  const handleSaveDetails = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      // Format sizes back to backend [[w, h]] format
      const formattedSizes = editSizes.map(s => [Number(s.width), Number(s.height)]);
      
      const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ location: editLocation, sizes: formattedSizes })
      });

      if (!res.ok) throw new Error('Failed to update details');

      // Update local state instantly
      setSubmission({ ...submission, location: editLocation, sizes: formattedSizes });
      setIsEditingDetails(false);
      setIsProcessing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes');
      setIsProcessing(false);
    }
  };

  // --- APPROVE / REJECT LOGIC ---
  const toggleImageSelection = (id: string) => {
    if (submission?.status !== 'pending') return; 
    setSelectedImageIds(prev => prev.includes(id) ? prev.filter(imgId => imgId !== id) : [...prev, id]);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !feedback.trim()) {
      alert("Please provide a reason for the rejection.");
      return;
    }
    if (action === 'approve' && selectedImageIds.length === 0) {
      alert("Please select at least one image to approve.");
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const payload = action === 'approve' ? { selectedImageIds } : { rejectionReason: feedback };

      const res = await fetch(`/api/jobs/${jobId}/submissions/${submissionId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to ${action} submission`);
      }
      
      setSubmission((prev: any) => ({
        ...prev,
        status: action === 'approve' ? 'approved' : 'rejected'
      }));
      
      setShowRejectForm(false);
      setIsProcessing(false);
    } catch (err: any) {
      alert(err.message || "Action failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // --- RENDERING ---
  if (isLoading) return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold bg-red-50 rounded-xl mt-6">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6 relative">
      
      {/* Fullscreen Image Lightbox Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 sm:p-8 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-4 right-6 text-white/70 hover:text-white text-4xl font-light" onClick={() => setFullscreenImage(null)}>&times;</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreenImage} alt="Fullscreen Wall" className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl" />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Review Photo #{submission?.photoNo}</h2>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-colors duration-500 ${
            submission?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
            submission?.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
            'bg-red-100 text-red-800'
          }`}>
            {submission?.status}
          </span>
        </div>
        <Link href={`/owner/jobs/${jobId}/submissions`} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold">
          ← Back to Submissions
        </Link>
      </div>

      {/* Details Card (Editable) */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900">Wall Details</h3>
          {!isEditingDetails && submission?.status === 'pending' && (
            <button onClick={handleStartEditing} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
              Edit Details
            </button>
          )}
        </div>

        {isEditingDetails ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                disabled={isProcessing}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 outline-none focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wall Dimensions (Width x Height ft)</label>
              <div className="space-y-2">
                {editSizes.map((size, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="number" step="any" value={size.width}
                      onChange={(e) => handleUpdateSize(idx, 'width', e.target.value)}
                      disabled={isProcessing}
                      className="block w-24 rounded-md border border-gray-300 p-2 text-gray-900 outline-none focus:border-indigo-500 text-center"
                      placeholder="W"
                    />
                    <span className="text-gray-500 font-bold">×</span>
                    <input
                      type="number" step="any" value={size.height}
                      onChange={(e) => handleUpdateSize(idx, 'height', e.target.value)}
                      disabled={isProcessing}
                      className="block w-24 rounded-md border border-gray-300 p-2 text-gray-900 outline-none focus:border-indigo-500 text-center"
                      placeholder="H"
                    />
                    
                    {/* Add/Remove logic can be added here if needed, keeping it simple to just edit existing arrays for the owner */}
                    {editSizes.length > 1 && (
                      <button 
                        onClick={() => setEditSizes(editSizes.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 px-2 font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setEditSizes([...editSizes, { width: '', height: '' }])}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
                >
                  + Add Size
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSaveDetails} 
                disabled={isProcessing || !editLocation || editSizes.some(s => !s.width || !s.height)}
                className="bg-indigo-600 text-white text-sm font-bold py-2 px-4 rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={() => setIsEditingDetails(false)} 
                disabled={isProcessing}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2 px-4 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">Location</p>
              <p className="font-medium text-gray-900">{submission?.location}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Dimensions</p>
              <p className="font-medium text-gray-900">
                {submission?.sizes?.map((s: number[]) => `${s[0]}x${s[1]}`).join(', ')} ft
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selectable Photo Gallery */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-gray-900">Uploaded Angles</h3>
          {submission?.status === 'pending' && (
            <span className="text-sm font-medium text-indigo-600">Select images to approve: {selectedImageIds.length} chosen</span>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {submission?.images.map((img: Photo) => {
            const isSelected = selectedImageIds.includes(img._id);
            return (
              <div 
                key={img._id} 
                onClick={() => toggleImageSelection(img._id)}
                className={`relative rounded-xl overflow-hidden border-4 transition-all group ${
                  submission?.status === 'pending' ? 'cursor-pointer hover:shadow-md' : ''
                } ${
                  isSelected ? 'border-emerald-500 shadow-md scale-[1.02]' : 'border-transparent border-gray-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.cloudinaryUrl} alt="Wall Angle" className="w-full h-48 object-cover" />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setFullscreenImage(img.cloudinaryUrl);
                  }}
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black text-white p-2.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  title="View Fullscreen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                </button>

                {isSelected && submission?.status === 'pending' && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Actions (Only show if pending) */}
      {submission?.status === 'pending' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8 animate-in fade-in duration-300">
          {!showRejectForm ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleAction('approve')}
                disabled={isProcessing || selectedImageIds.length === 0}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-emerald-400 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                {isProcessing ? 'Processing...' : 'Approve Selected Images'}
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
                  onClick={() => handleAction('reject')}
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
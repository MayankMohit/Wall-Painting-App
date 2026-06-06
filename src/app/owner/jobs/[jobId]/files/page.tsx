'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface ExportFile {
  _id: string;
  fileName: string;
  fileType: 'excel' | 'pdf_file' | 'pdf_photos';
  generatedAt?: string;
  fileSize?: number;
  status: 'generating' | 'ready' | 'failed';
}

export default function JobFilesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;
  const router = useRouter();

  const [files, setFiles] = useState<ExportFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('wallpainter_token');
      // Added ?t=Date.now() to completely bypass browser caching
      const res = await fetch(`/api/jobs/${jobId}/files?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` } // <-- CRITICAL: Added Auth token
      });
      
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [jobId]);

  // Polling for status updates (in case files are still generating)
  useEffect(() => {
    const hasGeneratingFiles = files.some(f => f.status === 'generating');
    if (!hasGeneratingFiles) return;
    const interval = setInterval(fetchFiles, 3000);
    return () => clearInterval(interval);
  }, [files]);

  const handleDownload = async (fileId: string) => {
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/files/${fileId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download not ready');
      
      const data = await res.json();
      
      window.location.href = data.url; 
      
    } catch (err) {
      alert("File is not ready yet.");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    // Optimistic UI update
    setFiles(files.filter(f => f._id !== fileId));
    
    const token = localStorage.getItem('wallpainter_token');
    await fetch(`/api/jobs/${jobId}/files/${fileId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` } 
    });
  };

  const formatBytes = (bytes?: number) => bytes ? (bytes / (1024 * 1024)).toFixed(2) + ' MB' : '...';

  return (
    <div className="space-y-6 mt-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Generated Files</h2>
        <button 
          onClick={() => router.push(`/owner/jobs/${jobId}`)}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
        >
          ← Back to Job
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">Loading files...</div>
        ) : files.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file._id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${file.fileType === 'excel' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{file.fileName}</h4>
                    <p className="text-xs text-gray-400 uppercase mt-0.5">{file.fileType.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {file.status === 'generating' ? (
                    <span className="text-sm text-orange-500 font-medium flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></span>
                      Generating...
                    </span>
                  ) : file.status === 'failed' ? (
                    <>
                      <span className="text-sm text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full">Failed</span>
                      <button onClick={() => handleDelete(file._id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Delete Failed File">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500">{formatBytes(file.fileSize)}</span>
                      <button onClick={() => handleDownload(file._id)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition">
                        Download
                      </button>
                      <button onClick={() => handleDelete(file._id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Delete File">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-gray-500">No files generated yet.</div>
        )}
      </div>
    </div>
  );
}
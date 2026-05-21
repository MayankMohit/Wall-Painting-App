'use client';

import { useEffect, useState, use } from 'react';

// Data structure matching GET /api/jobs/:jobId/exports
interface ExportFile {
  _id: string;
  filename: string;
  type: 'pdf' | 'zip';
  generatedAt: string;
  size: string;
  status: 'ready' | 'processing';
}

export default function JobFilesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [files, setFiles] = useState<ExportFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<'pdf' | 'zip' | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFiles = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/exports
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isMounted) {
        setFiles([
          {
            _id: 'file_001',
            filename: `WallPainter_Report_${jobId}.pdf`,
            type: 'pdf',
            generatedAt: 'Oct 15, 2024 at 10:30 AM',
            size: '4.2 MB',
            status: 'ready'
          },
          {
            _id: 'file_002',
            filename: `Raw_Images_${jobId}.zip`,
            type: 'zip',
            generatedAt: 'Oct 14, 2024 at 4:15 PM',
            size: '128 MB',
            status: 'ready'
          }
        ]);
        setIsLoading(false);
      }
    };

    fetchFiles();
    return () => { isMounted = false; };
  }, [jobId]);

  const handleGenerate = async (type: 'pdf' | 'zip') => {
    setIsGenerating(type);
    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: POST /api/jobs/:jobId/exports
      // Payload: { format: type }
      // ---------------------------------------------------------
      console.log(`Requesting new ${type.toUpperCase()} generation...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate generation time
      
      const newFile: ExportFile = {
        _id: `file_new_${Date.now()}`,
        filename: type === 'pdf' ? `Final_Report_${jobId}.pdf` : `All_Approved_Photos_${jobId}.zip`,
        type: type,
        generatedAt: 'Just now',
        size: type === 'pdf' ? 'Generating...' : 'Packaging...',
        status: 'ready'
      };

      setFiles([newFile, ...files]);
      alert(`${type.toUpperCase()} successfully generated!`);
    } catch (error) {
      alert("Failed to generate file. Please try again.");
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      
      {/* Header & Generation Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Export & Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Generate client-ready PDFs or download raw image archives.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleGenerate('pdf')}
            disabled={isGenerating !== null}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-colors ${
              isGenerating === 'pdf' ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isGenerating === 'pdf' ? (
              <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> PDF...</>
            ) : '+ Generate PDF'}
          </button>
          
          <button 
            onClick={() => handleGenerate('zip')}
            disabled={isGenerating !== null}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-colors border-2 ${
              isGenerating === 'zip' ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {isGenerating === 'zip' ? (
              <><span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span> ZIP...</>
            ) : '+ Generate ZIP'}
          </button>
        </div>
      </div>

      {/* File List */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Previous Exports</h3>
        
        {isLoading ? (
          <div className="py-10 text-center text-gray-500 animate-pulse">Loading files...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {files.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {files.map((file) => (
                  <li key={file._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      {/* File Icon */}
                      <div className={`p-3 rounded-lg ${file.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {file.type === 'pdf' ? (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        ) : (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                        )}
                      </div>
                      
                      {/* File Details */}
                      <div>
                        <h4 className="font-bold text-gray-900">{file.filename}</h4>
                        <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                          <span>{file.generatedAt}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{file.size}</span>
                        </div>
                      </div>
                    </div>

                    {/* Download Action */}
                    <button className="w-full sm:w-auto text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors bg-white shadow-sm flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500 font-medium">No files have been generated for this job yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';

interface WorkerTask {
  _id: string;
  taskType: 'PDF_REPORT_GEN' | 'ZIP_IMAGE_ARCHIVE' | 'CLOUDINARY_CLEANUP';
  targetJobId: string;
  status: 'queued' | 'processing' | 'failed' | 'completed';
  attempts: number;
  errorMessage?: string;
  startedAt: string;
}

export default function AdminQueuePage() {
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/queue
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));
      if (isMounted) {
        setTasks([
          { _id: 'tsk_01', taskType: 'PDF_REPORT_GEN', targetJobId: 'job_1042', status: 'failed', attempts: 3, errorMessage: 'Timeout connecting to generation binary engine', startedAt: '10 mins ago' },
          { _id: 'tsk_02', taskType: 'ZIP_IMAGE_ARCHIVE', targetJobId: 'job_1088', status: 'processing', attempts: 1, startedAt: 'Just now' },
          { _id: 'tsk_03', taskType: 'CLOUDINARY_CLEANUP', targetJobId: 'global', status: 'queued', attempts: 0, startedAt: 'In queue' }
        ]);
        setIsLoading(false);
      }
    };
    fetchQueue();
    return () => { isMounted = false; };
  }, []);

  const handleRetry = async (taskId: string) => {
    setIsRetryingId(taskId);
    // ---------------------------------------------------------
    // API TESTING PLACEHOLDER: POST /api/admin/queue/:id/retry
    // ---------------------------------------------------------
    await new Promise(resolve => setTimeout(resolve, 1200));
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'processing', attempts: t.attempts + 1, errorMessage: undefined } : t));
    setIsRetryingId(null);
    alert('Task repositioned to head of system queue.');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Task Queue Inspector</h1>
        <p className="text-slate-500 mt-1">Real-time status of heavy document generation tasks and image pipeline processes.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 animate-pulse">Inspecting cluster nodes...</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {tasks.map(task => (
              <div key={task._id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">{task.taskType}</span>
                    <span className="text-xs text-slate-400 font-mono">Job: {task.targetJobId}</span>
                  </div>
                  {task.errorMessage && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 font-mono max-w-2xl">{task.errorMessage}</p>
                  )}
                  <div className="text-xs text-slate-500">Attempts: <span className="font-bold">{task.attempts}</span> • Triggered: {task.startedAt}</div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    task.status === 'failed' ? 'bg-red-100 text-red-800' :
                    task.status === 'processing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {task.status}
                  </span>
                  
                  {task.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(task._id)}
                      disabled={isRetryingId !== null}
                      className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400"
                    >
                      {isRetryingId === task._id ? 'Dispatching...' : 'Retry Task'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
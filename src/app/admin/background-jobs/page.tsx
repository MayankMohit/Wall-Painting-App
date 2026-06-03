'use client';

import { useState, useEffect } from 'react';
interface BullJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  state: string;
  progress: number;
  attempts: number;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

type QueueName = 'fileGen' | 'notify' | 'assetCleanup';
type JobState  = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

const STATE_STYLES: Record<JobState, string> = {
  failed:    'bg-red-100 text-red-800',
  active:    'bg-blue-100 text-blue-800 animate-pulse',
  completed: 'bg-green-100 text-green-800',
  waiting:   'bg-slate-100 text-slate-600',
  delayed:   'bg-yellow-100 text-yellow-800',
};

export default function AdminQueuePage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
  const [jobs, setJobs] = useState<BullJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueName>('fileGen');
  const [state, setState] = useState<JobState>('failed');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setJobs([]);

    fetch(`/api/admin/background-jobs?queue=${queue}&state=${state}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (isMounted) { setJobs(json.data ?? []); setIsLoading(false); } })
      .catch(() => { if (isMounted) setIsLoading(false); });

    return () => { isMounted = false; };
  }, [token, queue, state]);

  const handleRetry = async (jobId: string) => {
    setIsRetryingId(jobId);
    await fetch(`/api/admin/background-jobs/${jobId}/retry?queue=${queue}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobs(prev => prev.filter(j => j.id !== jobId));
    setIsRetryingId(null);
  };

  const formatTime = (ms?: number) =>
    ms ? new Date(ms).toLocaleString() : 'N/A';

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Task Queue Inspector</h1>
        <p className="text-slate-500 mt-1">Real-time status of background jobs across all queues.</p>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Queue</label>
          <select
            value={queue}
            onChange={e => setQueue(e.target.value as QueueName)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
          >
            <option value="notify">notify</option>
            <option value="fileGen">fileGen</option>
            <option value="assetCleanup">assetCleanup</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">State</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as JobState)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
          >
            <option value="failed">failed</option>
            <option value="active">active</option>
            <option value="waiting">waiting</option>
            <option value="completed">completed</option>
            <option value="delayed">delayed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 animate-pulse">Inspecting queue...</div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center text-slate-400">No {state} jobs in {queue} queue.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {jobs.map(job => (
              <div key={job.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">{job.name}</span>
                    <span className="text-xs text-slate-400 font-mono">ID: {job.id}</span>
                  </div>
                  {job.failedReason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 font-mono max-w-2xl">{job.failedReason}</p>
                  )}
                  <div className="text-xs text-slate-500">
                    Attempts: <span className="font-bold">{job.attempts}</span>
                    {job.progress > 0 ? ` • Progress: ${job.progress}%` : ''}
                    {job.timestamp ? ` • Created: ${formatTime(job.timestamp)}` : ''}
                    {job.processedOn ? ` • Started: ${formatTime(job.processedOn)}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${STATE_STYLES[state]}`}>
                    {state}
                  </span>

                  {state === 'failed' && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      disabled={isRetryingId !== null}
                      className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400"
                    >
                      {isRetryingId === job.id ? 'Dispatching...' : 'Retry Task'}
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

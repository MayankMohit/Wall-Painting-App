'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  _id: string;
  actorEmail: string;
  actionType: 'AUTH_LOGIN' | 'USER_SUSPEND' | 'JOB_CREATION' | 'EXPORT_DOWNLOAD';
  ipAddress: string;
  timestamp: string;
  details: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/audit-logs
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 700));
      if (isMounted) {
        setLogs([
          { _id: 'log_01', actorEmail: 'admin@wallpainter.com', actionType: 'USER_SUSPEND', ipAddress: '192.168.1.50', timestamp: 'May 22, 2026, 10:14 AM', details: 'Suspended City Colors LLC account' },
          { _id: 'log_02', actorEmail: 'owner@premier.com', actionType: 'JOB_CREATION', ipAddress: '172.56.21.4', timestamp: 'May 22, 2026, 09:45 AM', details: 'Created job #1088 Corporate Blvd' },
          { _id: 'log_03', actorEmail: 'alex@wallpainter.com', actionType: 'AUTH_LOGIN', ipAddress: '45.89.2.112', timestamp: 'May 22, 2026, 08:12 AM', details: 'Successful token auth via app client' }
        ]);
        setIsLoading(false);
      }
    };
    fetchLogs();
    return () => { isMounted = false; };
  }, []);

  const filteredLogs = logs.filter(l => 
    l.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Audit Logs</h1>
          <p className="text-slate-500 mt-1">Immutable linear trace log of administrative and state altering interactions.</p>
        </div>
        <input 
          type="text" 
          placeholder="Filter logs by keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 p-2.5 rounded-lg border-2 border-slate-200 outline-none focus:border-teal-500 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm font-mono text-xs">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 animate-pulse">Reading audit pipeline buffers...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => (
              <div key={log._id} className="p-4 flex flex-col md:flex-row items-start justify-between gap-4 hover:bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-slate-400 font-bold">{log.timestamp}</span>
                    <span className="bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded font-bold text-[10px]">{log.actionType}</span>
                    <span className="text-teal-600 font-bold">{log.actorEmail}</span>
                  </div>
                  <p className="text-slate-700 font-sans text-sm font-medium pt-1">{log.details}</p>
                </div>
                <div className="text-slate-400 text-right text-[10px]">IP: {log.ipAddress}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
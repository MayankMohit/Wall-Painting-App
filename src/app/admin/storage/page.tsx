'use client';

import { useState, useEffect } from 'react';

interface StorageBucket {
  providerName: 'Cloudinary' | 'Cloudflare R2' | 'MongoDB Atlas';
  serviceType: 'Image Optimization CDN' | 'Raw Backup Archives' | 'JSON Document Engine';
  usedAmount: string;
  allocatedLimit: string;
  percentage: number;
}

export default function AdminStoragePage() {
  const [metrics, setMetrics] = useState<StorageBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStorageData = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/infra-metrics
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));
      if (isMounted) {
        setMetrics([
          { providerName: 'Cloudinary', serviceType: 'Image Optimization CDN', usedAmount: '342 GB', allocatedLimit: '500 GB', percentage: 68.4 },
          { providerName: 'Cloudflare R2', serviceType: 'Raw Backup Archives', usedAmount: '12.4 GB', allocatedLimit: '1000 GB', percentage: 1.24 },
          { providerName: 'MongoDB Atlas', serviceType: 'JSON Document Engine', usedAmount: '56 MB', allocatedLimit: '512 MB', percentage: 10.9 }
        ]);
        setIsLoading(false);
      }
    };
    fetchStorageData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Infrastructure Storage Allocation</h1>
        <p className="text-slate-500 mt-1">Cross-cloud cluster metrics tracking database records and asset footprints.</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-500 animate-pulse">Querying asset partitions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((bucket, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">{bucket.serviceType}</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{bucket.providerName}</h3>
                
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-700">
                    <span>Used: {bucket.usedAmount}</span>
                    <span className="text-slate-400">Quota: {bucket.allocatedLimit}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-3 bg-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${bucket.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 font-bold mt-4">{bucket.percentage}% capacity exhausted</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
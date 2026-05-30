'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function JobDetailsLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;
  const pathname = usePathname();

  const tabs = [
    { name: 'Overview', href: `/owner/jobs/${jobId}`, exact: true },
    { name: 'Painters', href: `/owner/jobs/${jobId}/painters`, exact: false },
    { name: 'Submissions', href: `/owner/jobs/${jobId}/submissions`, exact: false },
    { name: 'Generated Files', href: `/owner/jobs/${jobId}/files`, exact: false },
  ];

  return (
    <div className="space-y-6">
      
      {/* Breadcrumb & Job Header Navigation */}
      <div className="mt-4">
        <Link href="/owner/dashboard" className="text-indigo-600 hover:underline text-sm font-medium">
          ← Back to Dashboard
        </Link>
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Single Job Details
          </h1>
        </div>
      </div>

      {/* Persistent Tabs Menu */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full overflow-x-auto border border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.includes(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold rounded-md transition-all flex-1 text-center ${
                isActive 
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Page Content */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
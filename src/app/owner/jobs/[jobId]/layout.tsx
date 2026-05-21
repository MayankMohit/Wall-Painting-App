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
      <div>
        <Link href="/owner/jobs" className="text-indigo-600 hover:underline text-sm font-medium">
          ← Back to All Jobs
        </Link>
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Job Details <span className="text-gray-400 font-normal text-xl ml-2">{jobId}</span>
          </h1>
          
          {/* Quick Action Button */}
          <Link 
            href={`/owner/jobs/${jobId}/submissions`}
            className="mt-4 sm:mt-0 bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-sm text-sm flex items-center gap-2"
          >
            Review Pending Photos
          </Link>
        </div>
      </div>

      {/* Persistent Tabs Menu */}
      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg w-full overflow-x-auto">
        {tabs.map((tab) => {
          // Check if active. 'exact' is for the overview page so it doesn't stay highlighted on sub-pages
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.includes(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex-1 text-center ${
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

      {/* The specific page content (Overview, Painters, etc.) renders here */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
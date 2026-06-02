'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Painter {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function CreateJobPage() {
  const router = useRouter();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      companyName: '',
      description: '',
      painterIds: [] as string[]
    }
  });

  const [painters, setPainters] = useState<Painter[]>([]);
  const [isLoadingPainters, setIsLoadingPainters] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedPainterIds = watch('painterIds') || [];

  useEffect(() => {
    let isMounted = true;
    const fetchPainters = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) return;

        // Using our single, optimized User endpoint
        const res = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch painters');

        const json = await res.json();
        const fetchedPainters = json?.data?.users || json?.users || [];

        if (isMounted) {
          setPainters(fetchedPainters);
          setIsLoadingPainters(false);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) setIsLoadingPainters(false);
      }
    };

    fetchPainters();
    return () => { isMounted = false; };
  }, []);

  const filteredPainters = painters.filter(painter =>
    painter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (painter.phone && painter.phone.includes(searchTerm))
  );

  const togglePainter = (painterId: string) => {
    const currentSelected = selectedPainterIds;
    if (currentSelected.includes(painterId)) {
      setValue('painterIds', currentSelected.filter(id => id !== painterId), { shouldValidate: true });
    } else {
      setValue('painterIds', [...currentSelected, painterId], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('wallpainter_token');
      if (!token) throw new Error('You must be logged in to create a job.');

      const payload = {
        companyName: data.companyName,
        description: data.description,
        painterIds: data.painterIds
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to create job');
      }

      router.push('/owner/jobs');
    } catch (error: any) {
      setSubmitError(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 mt-4 pb-12">
      
      {/* 1. Sticky-ish Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6 sticky top-16 bg-gray-50 z-10 pt-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Create new job</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Fill in the company, scope and assign painters.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/owner/jobs"
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-full border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-center"
          >
            Cancel
          </Link>
          {/* HTML5 trick: The 'form' attribute connects this button to the form below */}
          <button
            type="submit"
            form="create-job-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-gray-900 text-white font-bold hover:bg-black transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              'Creating...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                Create job
              </>
            )}
          </button>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm font-medium text-sm">
          {submitError}
        </div>
      )}

      {/* 2. Main 2-Column Form */}
      <form id="create-job-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-12 pt-4">
        
        {/* LEFT COLUMN: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Job details</h2>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Company name</label>
            <input
              {...register('companyName', { required: true })}
              type="text"
              placeholder="e.g. Brightline Properties"
              disabled={isSubmitting}
              className="block w-full rounded-xl border border-gray-300 p-3.5 text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors shadow-sm text-base"
            />
            {errors.companyName && <span className="text-xs font-bold text-red-500 mt-2 block">Company name is required</span>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Floors 8-12 hallways, suites and stairwells..."
              disabled={isSubmitting}
              className="block w-full rounded-xl border border-gray-300 p-3.5 text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors shadow-sm text-base resize-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Assign Painters */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
            Assign painters <span className="text-gray-400 font-medium ml-1">· {selectedPainterIds.length} selected</span>
          </h2>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3.5 text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors shadow-sm text-sm font-medium"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {isLoadingPainters ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredPainters.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium text-sm">No painters found.</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredPainters.map((painter) => {
                  const isSelected = selectedPainterIds.includes(painter._id);
                  return (
                    <div
                      key={painter._id}
                      onClick={() => togglePainter(painter._id)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-[#fcfcfb]' : 'bg-white'}`}
                    >
                      {/* Custom Checkbox */}
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'}`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#9CA3AF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {painter.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">{painter.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{painter.phone || 'No phone'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium">Painters can be added or removed at any time from the job page.</p>
        </div>

      </form>
    </div>
  );
}
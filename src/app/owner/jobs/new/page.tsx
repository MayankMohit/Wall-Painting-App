'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Painter {
  _id: string;
  name: string;
  email: string;
}

export default function CreateJobPage() {
  const router = useRouter();

  // Cleaned up default values to match exactly what your schema wants
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPainterIds = watch('painterIds') || [];

  useEffect(() => {
    let isMounted = true;
    const fetchPainters = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) return;

        // 1. Hit the new dedicated, secure painters route
        const res = await fetch('/api/painters', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch painters');

        const json = await res.json();

        // 2. Safely extract the array (handles { data: [...] } or just [...])
        const fetchedPainters = json?.data || json?.painters || json || [];

        if (isMounted) {
          // 3. No need to filter! The backend already guarantees these are active painters.
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPainters = painters.filter(painter =>
    painter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    painter.email.toLowerCase().includes(searchTerm.toLowerCase())
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

      // Perfectly matches CreateJobSchema and JobSchema
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

      router.push('/owner/dashboard');
    } catch (error: any) {
      setSubmitError(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <div className="flex justify-between items-center border-b border-gray-200 pb-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-500 mt-1">Set up a new job and assign your team.</p>
        </div>
        <Link
          href="/owner/dashboard"
          className="text-gray-500 hover:text-gray-800 text-sm font-medium"
        >
          Cancel
        </Link>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative shadow-sm">
          {submitError}
        </div>
      )}

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Company Name (Required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Project Name *</label>
            <input
              {...register('companyName', { required: true })}
              type="text"
              placeholder="e.g. Ultratech Cement or Tech Park Exterior"
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none disabled:bg-gray-50"
            />
            {errors.companyName && <span className="text-xs text-red-500 mt-1">Company Name is required</span>}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Add location details, instructions, or scope of work..."
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none disabled:bg-gray-50 resize-none"
            />
          </div>

          {/* Assign Painters (Multi-Select) */}
          <div className="pt-4 border-t border-gray-100" ref={dropdownRef}>
            <label className="block text-sm font-bold text-gray-900 mb-3">Assign Painters</label>

            {selectedPainterIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedPainterIds.map(id => {
                  const painter = painters.find(p => p._id === id);
                  if (!painter) return null;
                  return (
                    <div key={id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium">
                      {painter.name}
                      <button
                        type="button"
                        onClick={() => togglePainter(id)}
                        className="ml-1 text-indigo-400 hover:text-indigo-800 focus:outline-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                placeholder={isLoadingPainters ? "Loading painters..." : "Search painters by name or email..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                disabled={isLoadingPainters}
                className="block w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none disabled:bg-gray-50"
              />

              {isDropdownOpen && !isLoadingPainters && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredPainters.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">No painters found matching "{searchTerm}"</div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredPainters.map((painter) => {
                        const isSelected = selectedPainterIds.includes(painter._id);
                        return (
                          <div
                            key={painter._id}
                            onClick={() => togglePainter(painter._id)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                {painter.name}
                              </span>
                              <span className="text-xs text-gray-500">{painter.email}</span>
                            </div>

                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white rounded-lg py-3.5 px-4 font-bold transition-colors shadow-sm ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              {isSubmitting ? 'Creating Job...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
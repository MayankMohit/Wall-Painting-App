'use client';

import { useState, useEffect } from 'react';
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
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const [painters, setPainters] = useState<Painter[]>([]);
  const [isLoadingPainters, setIsLoadingPainters] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available painters when the form loads
  useEffect(() => {
    let isMounted = true;
    
    const fetchPainters = async () => {
      // API TESTING PLACEHOLDER: GET /api/owner/painters
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isMounted) {
        setPainters([
          { _id: 'p_1', name: 'Alex Johnson', email: 'alex@wallpainter.com' },
          { _id: 'p_2', name: 'Maria Garcia', email: 'maria@wallpainter.com' },
          { _id: 'p_3', name: 'James Wilson', email: 'james@wallpainter.com' },
        ]);
        setIsLoadingPainters(false);
      }
    };

    fetchPainters();
    return () => { isMounted = false; };
  }, []);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: POST /api/jobs
      // Payload will look like: { jobName, location, assignedPainters: [...] }
      // ---------------------------------------------------------
      console.log("Submitting new job payload:", data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Success! New job created and assigned to painters.');
      router.push('/owner/jobs');
    } catch (error) {
      alert("Failed to create job.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-500 mt-1">Set up a new location and assign your team.</p>
        </div>
        <Link 
          href="/owner/jobs"
          className="text-gray-500 hover:text-gray-800 text-sm font-medium"
        >
          Cancel
        </Link>
      </div>

      {/* The Form */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Number</label>
              <input
                {...register('jobNumber', { required: true })}
                type="text"
                placeholder="e.g. #1095"
                disabled={isSubmitting}
                className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-indigo-600 outline-none disabled:bg-gray-50"
              />
              {errors.jobNumber && <span className="text-xs text-red-500 mt-1">Job Number is required</span>}
            </div>

            {/* Job Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                {...register('jobName', { required: true })}
                type="text"
                placeholder="e.g. Tech Park Exterior"
                disabled={isSubmitting}
                className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-indigo-600 outline-none disabled:bg-gray-50"
              />
              {errors.jobName && <span className="text-xs text-red-500 mt-1">Project Name is required</span>}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Address</label>
            <input
              {...register('location', { required: true })}
              type="text"
              placeholder="123 Main St, City, State"
              disabled={isSubmitting}
              className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 focus:border-indigo-600 focus:ring-indigo-600 outline-none disabled:bg-gray-50"
            />
            {errors.location && <span className="text-xs text-red-500 mt-1">Location is required</span>}
          </div>

          {/* Painter Assignment */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-3">Assign Painters</label>
            
            {isLoadingPainters ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-b-2 border-indigo-600 rounded-full"></span>
                Loading available painters...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {painters.map((painter) => (
                  <label 
                    key={painter._id} 
                    className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50"
                  >
                    <input 
                      type="checkbox" 
                      value={painter._id}
                      {...register('assignedPainters')}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600"
                    />
                    <div className="ml-3 flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{painter.name}</span>
                      <span className="text-xs text-gray-500">{painter.email}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">Selected painters will see this job on their dashboard immediately.</p>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white rounded-lg py-3.5 px-4 font-bold transition-colors shadow-sm ${
                isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? 'Creating Job...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
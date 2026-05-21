'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, devLoginAsPainter, devLoginAsOwner } = useAuthStore();
  const { register, handleSubmit } = useForm();

  // Handle standard form submission
  const onSubmit = (data: any) => {
    console.log("Form Submitted:", data);
    // Fake login as owner by default for now
    login(data.email, 'owner'); 
    router.push('/dashboard'); // Route to generic dashboard
  };

  // Developer hack functions
  const handleDevPainter = () => {
    devLoginAsPainter();
    router.push('/painter/dashboard');
  };

  const handleDevOwner = () => {
    devLoginAsOwner();
    router.push('/owner/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-500 mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
  {...register('email')}
  type="email"
  className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
  placeholder="you@example.com"
/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            {...register('password')}
            type="password"
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
      </form>

      {/* DEV HACK BUTTONS - Remove before production! */}
      <div className="pt-6 mt-6 border-t border-gray-200">
        <p className="text-xs text-center text-gray-400 mb-3 uppercase tracking-wider">
          Developer Fast-Login
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleDevPainter} className="w-1/2 bg-emerald-100 text-emerald-700 rounded p-2 text-sm font-medium hover:bg-emerald-200">
            Log in as Painter
          </button>
          <button type="button" onClick={handleDevOwner} className="w-1/2 bg-purple-100 text-purple-700 rounded p-2 text-sm font-medium hover:bg-purple-200">
            Log in as Owner
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: any) => {
    const success = await login(data.email, data.password);
    
    if (success) {
      const currentRole = useAuthStore.getState().user?.role;
      if (currentRole === 'admin') router.push('/admin/dashboard');
      else if (currentRole === 'owner') router.push('/owner/dashboard');
      else router.push('/painter/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-500 mt-2">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            {...register('email')}
            type="email"
            required
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            {...register('password')}
            type="password"
            required
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white rounded-md py-3 px-4 hover:bg-blue-700 transition-colors font-bold disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
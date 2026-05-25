'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser, isLoading, error, clearError } = useAuthStore();
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: any) => {
    const success = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone || undefined, // Backend expects string or undefined
    });
    
    if (success) {
      // Send them to their respective dashboard instantly!
      if (data.role === 'owner') router.push('/owner/dashboard');
      else router.push('/painter/dashboard');
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
        <p className="text-gray-500 mt-2">Join WallPainter today</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            {...register('name')}
            type="text"
            required
            className="mt-1 block w-full text-gray-600 rounded-md border-2 border-gray-400 p-3 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            {...register('email')}
            type="email"
            required
            className="mt-1 block w-full text-gray-600 rounded-md border-2 border-gray-400 p-3 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            {...register('password')}
            type="password"
            required
            minLength={8}
            className="mt-1 block w-full text-gray-600 rounded-md border-2 border-gray-400 p-3 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Type</label>
          <select
            {...register('role')}
            required
            className="mt-1 block w-full text-gray-600 rounded-md border-2 border-gray-400 p-3 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none bg-white"
          >
            <option value="painter">I am a Painter</option>
            <option value="owner">I am a Business Owner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
          <input
            {...register('phone')}
            type="tel"
            className="mt-1 block w-full text-gray-600 rounded-md border-2 border-gray-400 p-3 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="(555) 555-5555"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white rounded-md py-3 px-4 hover:bg-blue-700 transition-colors font-bold disabled:bg-blue-400 disabled:cursor-not-allowed mt-4"
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
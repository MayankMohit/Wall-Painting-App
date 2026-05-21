'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    console.log("Submitting Registration:", data);
    // Real logic will go here later
    alert("Dummy Registration successful! Redirecting to login...");
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
        <p className="text-gray-500 mt-2">Join WallPainter Pro</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">I am a...</label>
          <select 
            {...register('role')} 
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
          >
            <option value="painter">Painter (Contractor)</option>
            <option value="owner">Business Owner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            {...register('name')}
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            {...register('email')}
            type="email"
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            {...register('phone')}
            type="tel"
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="+1 (555) 000-0000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            {...register('password')}
            type="password"
            className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-md py-3 px-4 font-medium hover:bg-blue-700 transition-colors"
        >
          Register
        </button>
      </form>

      <div className="text-center text-sm text-gray-600 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Sign In here
        </Link>
      </div>
    </div>
  );
}
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', db: 'disconnected', message: (error as Error).message },
      { status: 500 }
    );
  }
}

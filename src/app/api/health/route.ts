import { connectDB } from '@/lib/db';
import { ok, err } from '@/lib/api-response';

export async function GET() {
  try {
    await connectDB();
    return ok({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    return err(`DB unavailable: ${(error as Error).message}`, 503);
  }
}

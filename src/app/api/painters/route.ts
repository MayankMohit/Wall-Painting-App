import { connectDB } from '@/lib/db';
import { User } from '@/lib/models'; // Adjust path if your index file is different
import { requireAuth } from '@/lib/rbac';
import { ok, forbidden, err } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    // 1. Authenticate the request
    const auth = await requireAuth(request);

    // 2. Authorization (RBAC): Only owners (and admins) should be able to list all painters
    if (auth.role !== 'owner' && auth.role !== 'admin') {
      return forbidden();
    }

    await connectDB();

    // 3. Fetch only painters who are active
    const painters = await User.find({ 
      role: 'painter',
      status: 'active' 
    })
    // CRITICAL: Only select the safe fields we actually need on the frontend.
    // Never send the full document to avoid leaking passwords or security tokens.
    .select('_id name email phone')
    .sort({ name: 1 }) // Alphabetical order by name
    .lean();

    // 4. Return the data
    // (Using your ok() helper, this will likely format as { data: [...] })
    return ok(painters);
    
  } catch (e) {
    // If requireAuth threw a Response (like a 401), pass it through
    if (e instanceof Response) return e;
    
    console.error('[GET /api/painters] Error:', e);
    return err('Failed to fetch painters', 500);
  }
}
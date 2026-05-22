import { requireAuth } from '@/lib/rbac';
import { ok, badRequest, err } from '@/lib/api-response';
import { signUpload } from '@/lib/cloudinary';
import { SignUploadSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // body is optional — treat missing/invalid JSON as empty object
  }

  const parsed = SignUploadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  try {
    const payload = signUpload({ folder: parsed.data.folder });
    return ok(payload);
  } catch (e) {
    console.error('[POST /api/uploads/sign]', e);
    return err('Failed to generate upload signature', 500);
  }
}

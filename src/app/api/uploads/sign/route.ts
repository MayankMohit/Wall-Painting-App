import { ok } from '@/lib/api-response';
import { signUpload } from '@/lib/cloudinary';
import { SignUploadSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const POST = withAuth()(
  async (req, ctx) => {
    const raw = await req.json().catch(() => ({}));
    const parsed = SignUploadSchema.safeParse(raw);
    if (!parsed.success) return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message);
    return ok(signUpload({ folder: parsed.data.folder }));
  }
);

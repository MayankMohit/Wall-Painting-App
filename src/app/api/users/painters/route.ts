import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { created } from '@/lib/api-response';
import { CreatePainterSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type CreatePainterBody = z.infer<typeof CreatePainterSchema>;

// POST — Owner/admin provisions a painter account (no password). Phone is the
// painter's identity, so a phone conflict surfaces the existing painter so the UI
// can offer "add to job instead". Name collisions are allowed.
export const POST = withRole(['owner', 'admin'], { schema: CreatePainterSchema, audit: 'PAINTER_PROVISIONED' })(
  async (req, ctx) => {
    const { name, phone, email } = ctx.body as CreatePainterBody;

    await connectDB();

    const phoneConflict = await User.findOne({ phone }).select('name phone role');
    if (phoneConflict) {
      // Only reveal painter details (so an owner can add them); never leak owner/admin accounts.
      if (phoneConflict.role === 'painter') {
        ctx.fail(409, ErrorCodes.PHONE_TAKEN, 'A painter with this phone number already exists', {
          existingPainter: {
            _id:   phoneConflict._id.toString(),
            name:  phoneConflict.name,
            phone: phoneConflict.phone,
          },
        });
      }
      ctx.fail(409, ErrorCodes.PHONE_TAKEN, 'This phone number is already registered');
    }

    if (email) {
      const emailConflict = await User.findOne({ email: email.toLowerCase() }).select('_id');
      if (emailConflict) ctx.fail(409, ErrorCodes.EMAIL_TAKEN, 'Email already registered');
    }

    const painter = await User.create({
      name,
      phone,
      role: 'painter',
      status: 'active',
      emailVerified: false,
      ...(email ? { email: email.toLowerCase() } : {}),
    });

    ctx.setAudit('PAINTER_PROVISIONED', { type: 'User', id: painter._id.toString() }, { painterId: painter._id.toString(), phone });

    return created({
      painter: {
        _id:    painter._id,
        name:   painter.name,
        phone:  painter.phone,
        email:  painter.email ?? null,
        role:   painter.role,
        status: painter.status,
      },
    });
  }
);

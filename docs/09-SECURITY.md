# Security Best Practices

---

## 1. Password Hashing

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

---

## 2. JWT Tokens

```typescript
const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '7d', algorithm: 'HS256' }
);

// Verify
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
```

---

## 3. Input Validation

```typescript
// Zod schemas
const submissionSchema = z.object({
  jobId: z.string().regex(/^[0-9a-f]{24}$/), // MongoDB ObjectId
  location: z.string().min(3).max(500),
  paintingSize: z.enum(['small', 'medium', 'large']),
  images: z.array(z.object({
    cloudinaryId: z.string(),
    cloudinaryUrl: z.string().url()
  }))
});

// Validate all inputs
const data = submissionSchema.parse(req.body);
```

---

## 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

---

## 5. File Upload Validation

```typescript
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function validateImage(file: File) {
  if (file.size > MAX_SIZE) throw new Error('File too large');
  if (!ALLOWED_MIMES.includes(file.type)) throw new Error('Invalid type');

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).subarray(0, 4);
  const hex = Array.from(bytes)
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');

  // JPEG: FFD8FF | PNG: 89504E47
  if (!hex.startsWith('ffd8ff') && !hex.startsWith('89504e47')) {
    throw new Error('Invalid file format');
  }
}
```

---

## 6. CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 7. Secure Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:']
    }
  }
}));
```

---

## 8. Data Encryption (Optional)

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export function encrypt(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}
```

---

## 9. Audit Logging

```typescript
export async function logAudit(
  userId: string,
  action: string,
  entityId: string
) {
  await AuditLog.create({
    userId,
    action, // 'create', 'update', 'delete'
    entityId,
    timestamp: new Date(),
    ipAddress: getClientIp()
  });
}
```

---

## 10. Environment Security

```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# All secrets in Vercel dashboard
# Rotation: Change secrets every 90 days
```

---

## Role-Based Access Control

```typescript
// lib/rbac.ts
export const rolePermissions = {
  painter: [
    'view_assigned_jobs',
    'submit_form',
    'edit_own_submission', // Within 2 hours
    'view_own_submissions',
    'upload_images'
  ],

  owner: [
    'view_all_jobs',
    'create_job',
    'edit_job',
    'view_all_submissions',
    'approve_submission',
    'reject_submission',
    'edit_submission', // Owner can edit any submission
    'delete_submission',
    'generate_excel',
    'generate_photos_pdf',
    'download_files',
    'view_photos',
    'download_photos_pdf',
    'manage_painters',
    'manage_companies'
  ],

  admin: [
    'manage_all_users',
    'manage_all_jobs',
    'manage_all_submissions',
    'view_system_logs',
    'view_background_jobs',
    'delete_files',
    'view_all_analytics'
  ]
};

export const hasPermission = (role: string, permission: string): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};
```

---

## Security Checklist

- ✅ JWT authentication (7-day expiry)
- ✅ Role-based access control (RBAC)
- ✅ Input validation (Zod schemas)
- ✅ Password hashing (bcryptjs)
- ✅ Rate limiting (5 attempts/15 min)
- ✅ File upload validation (magic bytes)
- ✅ CORS headers configured
- ✅ Helmet security headers
- ✅ Audit logging enabled
- ✅ Environment variables secured

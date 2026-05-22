import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  name: z.string().min(1, { error: 'Name is required' }).trim(),
  role: z.enum(['painter', 'owner']),
  phone: z.string().trim().optional(),
});

export const LoginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(1, { error: 'Password is required' }),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).trim().optional(),
  phone: z.string().trim().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Current password is required' }),
  newPassword: z.string().min(8, { error: 'New password must be at least 8 characters' }),
});

export const CreateJobSchema = z.object({
  companyName: z.string().min(1, { error: 'Company name is required' }).trim(),
  description: z.string().trim().optional(),
  painterIds: z.array(z.string()).default([]),
});

export const UpdateJobSchema = z.object({
  companyName: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  painterIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'completed', 'invoiced']).optional(),
});

export const CreateSubmissionSchema = z.object({
  photoNo: z.number().int().positive({ error: 'Photo number must be a positive integer' }),
  location: z.string().min(1, { error: 'Location is required' }).trim(),
  sizes: z
    .array(z.tuple([z.number().positive(), z.number().positive()]))
    .min(1, { error: 'At least one size is required' }),
  imageIds: z.array(z.string()).min(1, { error: 'At least one image is required' }),
});

export const UpdateSubmissionSchema = z.object({
  location: z.string().min(1).trim().optional(),
  sizes: z.array(z.tuple([z.number().positive(), z.number().positive()])).optional(),
  imageIds: z.array(z.string()).optional(),
});

export const ApproveSubmissionSchema = z.object({
  selectedImageIds: z.array(z.string()).min(1, { error: 'Select at least one image to approve' }),
});

export const RejectSubmissionSchema = z.object({
  rejectionReason: z.string().min(1, { error: 'Rejection reason is required' }),
});

export const RevokeSubmissionSchema = z.object({
  revokeNote: z.string().optional(),
});

export const GenerateFileSchema = z.object({
  type: z.enum(['excel', 'pdf-report', 'pdf-photos']),
});

export const FCMTokenSchema = z.object({
  token: z.string().min(1, { error: 'FCM token is required' }),
});

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { error: 'Reset token is required' }),
  newPassword: z.string().min(8, { error: 'Password must be at least 8 characters' }),
});

export const AddPainterSchema = z.object({
  painterId: z.string().min(1, { error: 'Painter ID is required' }),
});

export const UpdateAdminUserSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).trim().optional(),
  role: z.enum(['painter', 'owner', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const SignUploadSchema = z.object({
  folder: z.string().trim().optional(),
});

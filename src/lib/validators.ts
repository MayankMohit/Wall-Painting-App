import { z } from 'zod';

export const PhoneRegex = /^\+[1-9]\d{7,14}$/;

export const RegisterSchema = z.object({
  name:            z.string().min(1, { error: 'Name is required' }).trim(),
  email:           z.email({ error: 'Invalid email address' }),
  phone:           z.string().trim().regex(PhoneRegex, { error: 'Phone must be in E.164 format e.g. +919876543210' }),
  password:        z.string().min(8, { error: 'Password must be at least 8 characters' }),
  role:            z.enum(['painter', 'owner']),
  firebaseIdToken: z.string().min(1, { error: 'Phone verification is required' }),
  emailOtp:        z.string().length(6).optional(),
  sessionId:       z.string().optional(),
}).refine(
  (d) => d.role !== 'owner' || (d.emailOtp && d.sessionId),
  { message: 'Email OTP and session ID are required for owner registration', path: ['emailOtp'] }
);

export const LoginSchema = z.object({
  identifier: z.string().min(1, { error: 'Email or phone number is required' }),
  password:   z.string().min(1, { error: 'Password is required' }),
});

export const VerifyEmailSendSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
});

export const VerifyEmailConfirmSchema = z.object({
  sessionId: z.string().min(1),
  otp:       z.string().length(6),
});

export const ChangeEmailSendSchema = z.object({
  newEmail:  z.email({ error: 'Invalid email address' }),
  password:  z.string().min(1, { error: 'Password is required' }),
});

export const ChangeEmailConfirmSchema = z.object({
  sessionId: z.string().min(1),
  otp:       z.string().length(6),
});

export const LoginOtpSendSchema = z.object({
  identifier: z.email({ error: 'Invalid email address' }),
});

export const LoginOtpVerifySchema = z.object({
  sessionId: z.string().min(1),
  otp:       z.string().length(6),
});

export const LoginOtpPhoneSchema = z.object({
  phone:           z.string().trim().regex(PhoneRegex, { error: 'Invalid phone number' }),
  firebaseIdToken: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).trim().optional(),
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
  uploadedImages: z.array(
    z.object({
      cloudinaryId: z.string().min(1),
      cloudinaryUrl: z.string().url(),
      previewCloudinaryId: z.string(),
      previewCloudinaryUrl: z.string().url(),
    })
  ).min(1, { error: 'At least one image is required' }),
});

export const UpdateSubmissionSchema = z.object({
  location: z.string().min(1).trim().optional(),
  sizes: z.array(z.tuple([z.number().positive(), z.number().positive()])).optional(),
  uploadedImages: z.array(
    z.object({
      cloudinaryId: z.string().min(1),
      cloudinaryUrl: z.string().url(),
      previewCloudinaryId: z.string(), 
      previewCloudinaryUrl: z.string().url(),
    })
  ).optional(),
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
  status: z.enum(['active', 'inactive', 'suspended']).optional(), // 'suspended' also covers admin-rejected owners
});

export const SignUploadSchema = z.object({
  folder: z.string().trim().optional(),
});

export const NotificationPreferenceSchema = z.object({
  push:  z.record(z.string(), z.boolean()).optional(),
  email: z.record(z.string(), z.boolean()).optional(),
  quietHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, { error: 'Use HH:MM format' }),
    end:   z.string().regex(/^\d{2}:\d{2}$/, { error: 'Use HH:MM format' }),
    tz:    z.string().min(1, { error: 'Timezone is required' }),
  }).nullable().optional(),
  digest: z.boolean().optional(),
});

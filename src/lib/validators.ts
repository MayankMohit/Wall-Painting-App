import { z } from 'zod';

export const PhoneRegex = /^\+[1-9]\d{7,14}$/;

export const RegisterSchema = z.object({
  name:            z.string().min(1, { error: 'Name is required' }).trim(),
  email:           z.email({ error: 'Invalid email address' }),
  phone:           z.string().trim().regex(PhoneRegex, { error: 'Phone must be in E.164 format e.g. +919876543210' }),
  password:        z.string().min(8, { error: 'Password must be at least 8 characters' }),
  role:            z.enum(['painter', 'owner']),
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

export const CreatePainterSchema = z.object({
  name:  z.string().min(1, { error: 'Name is required' }).trim(),
  phone: z.string().trim().regex(PhoneRegex, { error: 'Phone must be in E.164 format e.g. +919876543210' }),
  email: z.email({ error: 'Invalid email address' }).optional(),
});

// Owner creates / revokes a painter's invite for a job (painter must already be on the job).
export const InvitePainterSchema = z.object({
  painterId: z.string().min(1, { error: 'Painter ID is required' }),
});

// Public claim — the raw token from the /join/<token> link.
export const InviteClaimSchema = z.object({
  token: z.string().min(1, { error: 'Invite token is required' }),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).trim().optional(),
});

export const ChangePasswordSchema = z.object({
  // Required for owners (re-authentication); optional for other roles. Enforced in the handler.
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, { error: 'New password must be at least 8 characters' }),
});

export const CreateJobSchema = z.object({
  companyName: z.string().trim().min(1, { error: 'Company name is required' }),
  description: z.string().trim().optional(),
  painterIds: z.array(z.string()).default([]),
  jobType: z.enum(['Wall', 'Shutter', 'Van']),
  pdfFormat: z.enum(['A', 'B']),
});

export const UpdateJobSchema = z.object({
  companyName: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  painterIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'completed', 'invoiced']).optional(),
  jobType: z.enum(['Wall', 'Shutter', 'Van']).optional(),
  pdfFormat: z.enum(['A', 'B']).optional(),
});

export const CreateSubmissionSchema = z.object({
  photoNo: z.number().int().positive({ error: 'Photo number must be a positive integer' }),
  location: z.string().min(1, { error: 'Location is required' }).max(100, { error: 'Location must be 100 characters or fewer' }).trim(),
  sizes: z
    .array(z.tuple([z.number().positive(), z.number().positive()]))
    .max(10, { error: 'A submission cannot have more than 10 sizes' })
    .optional(),

  // --- NEW FORMAT B FIELDS ---
  sizeLabels: z.array(z.string()).optional(),
  shopName: z.string().trim().optional(),
  contactNo: z.string().trim().optional(),
  vanNo: z.string().trim().optional(),
  aboveBelow: z.enum(['Above', 'Below']).optional(),
  
  uploadedImages: z.array(
    z.object({
      cloudinaryId        : z.string().min(1),
      cloudinaryUrl       : z.string().url(),
      previewCloudinaryId : z.string().min(1),
      previewCloudinaryUrl: z.string().url(),
    })
  ).min(1, { error: 'At least one image is required' })
   .max(20, { error: 'A submission cannot have more than 20 images' }),
});

export const UpdateSubmissionSchema = z.object({
  photoNo: z.number().int().positive({ error: 'Photo number must be a positive integer' }).optional(),
  location: z.string().min(1).max(100, { error: 'Location must be 100 characters or fewer' }).trim().optional(),
  sizes: z.array(z.tuple([z.number().positive(), z.number().positive()]))
    .max(10, { error: 'A submission cannot have more than 10 sizes' }).optional(),
  ownerSizes: z.array(z.tuple([z.number().positive(), z.number().positive()]))
    .max(10, { error: 'A submission cannot have more than 10 sizes' }).optional(),
    
  // --- NEW FORMAT B FIELDS ---
  sizeLabels: z.array(z.string()).optional(), // Added sizeLabels
  shopName: z.string().trim().optional(),
  contactNo: z.string().trim().optional(),
  vanNo: z.string().trim().optional(),
  aboveBelow: z.enum(['Above', 'Below']).optional(),

  uploadedImages: z.array(
    z.object({
      cloudinaryId        : z.string().min(1),
      cloudinaryUrl       : z.string().url(),
      previewCloudinaryId : z.string().min(1),
      previewCloudinaryUrl: z.string().url(),
    })
  ).max(20, { error: 'Cannot add more than 20 images at once' }).optional(),
});

export const ApproveSubmissionSchema = z.object({
  selectedImageIds: z.array(z.string()).min(1, { error: 'Select at least one image to approve' }),
});

export const RejectSubmissionSchema = z.object({
  rejectionReason: z.string().optional().default(''),
});

export const RevokeSubmissionSchema = z.object({
  revokeNote: z.string().optional(),
});

// Owner-supplied letterhead/title text written into generated Excel/PDF files.
// All optional, trimmed, and length-capped so they can't bloat the document.
// Formula-injection safety for the Excel cells is handled by sanitizeCell() at write time.
export const OwnerInputSchema = z.object({
  companyName: z.string().trim().max(120, { error: 'Company name must be 120 characters or fewer' }).optional(),
  jobName:     z.string().trim().max(120, { error: 'Job name must be 120 characters or fewer' }).optional(),
  city:        z.string().trim().max(120, { error: 'City must be 120 characters or fewer' }).optional(),
  address:     z.string().trim().max(300, { error: 'Address must be 300 characters or fewer' }).optional(),
});

export const GenerateFilesSchema = z.object({
  types: z.array(z.enum(['excel', 'excel_painters', 'pdf_file', 'pdf_photos']))
    .min(1, { error: 'Please select at least one valid file type to generate.' }),
  ownerInput: OwnerInputSchema.optional(),
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

export const AdminReasonSchema = z.object({
  reason: z.string().min(1).trim().optional(),
});

export const SignUploadSchema = z.object({
  folder: z.string().trim().optional(),
});

export const QueueActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'status']).default('status'),
  queue:  z.enum(['fileGen', 'notify', 'assetCleanup']).default('notify'),
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
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  painterId: Types.ObjectId;
  jobId: Types.ObjectId;

  // For the new format B
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: 'Above' | 'Below';

  photoNo: number;
  location: string;
  sizes: [number, number][];

  // NEW: Stores the specific label for each size (e.g., "Top Wall", "Side")
  // Indexes match 1:1 with the `sizes` array.
  sizeLabels?: string[];

  // Owner's own copy of the sizes — created on approval (defaults to the painter's
  // sizes), cleared on revoke, never sent to painters. Used for the master Excel/PDF.
  ownerSizes?: [number, number][];
  images: Types.ObjectId[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  revokedAt?: Date;
  rejectionReason?: string;
  revokeNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    painterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    photoNo: { type: Number, required: true },
    shopName: { type: String, trim: true },
    contactNo: { type: String, trim: true },
    vanNo: { type: String, trim: true },
    aboveBelow: { type: String, enum: ['Above', 'Below'] },
    location: { type: String, required: true, trim: true },
    sizes: { type: [[Number]]},
    sizeLabels: { type: [String], default: [] },
    ownerSizes: { type: [[Number]], default: undefined },
    images: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
      validate: {
        validator: (arr: unknown[]) => arr.length >= 1,
        message: 'A submission must have at least one photo',
      },
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    revokedAt: { type: Date },
    rejectionReason: { type: String },
    revokeNote: { type: String },
  },
  { timestamps: true }
);

SubmissionSchema.index({ jobId: 1, status: 1 });
SubmissionSchema.index({ painterId: 1, jobId: 1 });
SubmissionSchema.index({ jobId: 1, painterId: 1, photoNo: 1 }, { unique: true });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Submission'];
}

export const Submission =
  (mongoose.models.Submission as mongoose.Model<ISubmission>) ||
  mongoose.model<ISubmission>('Submission', SubmissionSchema);

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  painterId: Types.ObjectId;
  jobId: Types.ObjectId;
  photoNo: number;
  location: string;
  sizes: [number, number][];
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
    location: { type: String, required: true, trim: true },
    sizes: { type: [[Number]], required: true },
    images: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
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

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Submission'];
}

export const Submission =
  (mongoose.models.Submission as mongoose.Model<ISubmission>) ||
  mongoose.model<ISubmission>('Submission', SubmissionSchema);

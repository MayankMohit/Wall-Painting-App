import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBackgroundJob extends Document {
  _id: Types.ObjectId;
  jobType: 'watermarking' | 'excel_gen' | 'pdf_file_gen' | 'pdf_photo_gen' | 'email';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  retryCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BackgroundJobSchema = new Schema<IBackgroundJob>(
  {
    jobType: {
      type: String,
      enum: ['watermarking', 'excel_gen', 'pdf_file_gen', 'pdf_photo_gen', 'email'],
      required: true,
    },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

BackgroundJobSchema.index({ status: 1, jobType: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['BackgroundJob'];
}

export const BackgroundJob =
  (mongoose.models.BackgroundJob as mongoose.Model<IBackgroundJob>) ||
  mongoose.model<IBackgroundJob>('BackgroundJob', BackgroundJobSchema);

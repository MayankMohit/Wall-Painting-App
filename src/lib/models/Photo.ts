import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPhoto extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  cloudinaryId: string;
  cloudinaryUrl: string;
  r2Path?: string;
  watermarkedUrl: string | null;
  generatedNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    cloudinaryId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    r2Path: { type: String },
    watermarkedUrl: { type: String, default: null },
    generatedNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

PhotoSchema.index({ jobId: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Photo'];
}

export const Photo = (mongoose.models.Photo as mongoose.Model<IPhoto>) || mongoose.model<IPhoto>('Photo', PhotoSchema);

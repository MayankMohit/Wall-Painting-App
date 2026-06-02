import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPhoto extends Document {
  jobId: Types.ObjectId;
  cloudinaryId: string;
  cloudinaryUrl: string; // High quality (Print)
  
  // New Preview fields
  previewCloudinaryId: string;
  previewCloudinaryUrl: string; // Highly compressed (Web)
  
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
    previewCloudinaryId: { type: String, required: true },
    previewCloudinaryUrl: { type: String, required: true },
    watermarkedUrl: { type: String, default: null },
    generatedNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

PhotoSchema.index({ jobId: 1 });

export const Photo = mongoose.models.Photo || mongoose.model<IPhoto>('Photo', PhotoSchema);
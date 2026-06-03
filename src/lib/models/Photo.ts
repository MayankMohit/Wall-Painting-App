import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPhoto extends Document {
  jobId: Types.ObjectId;
  cloudinaryId: string;
  cloudinaryUrl: string; // High quality (Print)
  
  // Preview fields
  previewCloudinaryId: string;
  previewCloudinaryUrl: string; // Highly compressed (Web)
  
  watermarkedUrl: string | null;
  generatedNumber: string | null; // Must allow null until approval
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
    generatedNumber: { type: String, default: null }, // Removed 'required' and global 'unique'
  },
  { timestamps: true }
);

PhotoSchema.index({ jobId: 1 });

// THE MAGIC INDEX: Enforces that generatedNumbers are unique WITHIN a specific job, 
// but ignores photos that have a 'null' generatedNumber (pending/rejected photos).
PhotoSchema.index(
  { jobId: 1, generatedNumber: 1 },
  { unique: true, partialFilterExpression: { generatedNumber: { $type: 'string' } } }
);

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Photo'];
}

export const Photo = (mongoose.models.Photo as mongoose.Model<IPhoto>) || mongoose.model<IPhoto>('Photo', PhotoSchema);
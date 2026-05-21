import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGeneratedFile extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  fileType: 'excel' | 'pdf_file' | 'pdf_photos';
  fileName: string;
  r2Path: string;
  r2Url: string;
  fileSize: number;
  status: 'generating' | 'ready';
  generatedBy: Types.ObjectId;
  generatedAt: Date;
  expiresAt: Date;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedFileSchema = new Schema<IGeneratedFile>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    fileType: { type: String, enum: ['excel', 'pdf_file', 'pdf_photos'], required: true },
    fileName: { type: String, required: true },
    r2Path: { type: String, required: true },
    r2Url: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ['generating', 'ready'], default: 'generating' },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GeneratedFileSchema.index({ jobId: 1, fileType: 1 });

export const GeneratedFile =
  (mongoose.models.GeneratedFile as mongoose.Model<IGeneratedFile>) ||
  mongoose.model<IGeneratedFile>('GeneratedFile', GeneratedFileSchema);

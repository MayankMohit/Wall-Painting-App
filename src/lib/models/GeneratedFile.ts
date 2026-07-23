import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGeneratedFile extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  fileType: 'excel' | 'excel_painters' | 'pdf_file' | 'pdf_photos' | 'pdf_excel';
  fileName: string;
  r2Path?: string;
  r2Url?: string;
  fileSize?: number;
  status: 'generating' | 'ready' | 'failed';
  generatedBy: Types.ObjectId;
  generatedAt?: Date;
  expiresAt?: Date;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedFileSchema = new Schema<IGeneratedFile>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    fileType: { type: String, enum: ['excel', 'excel_painters', 'pdf_file', 'pdf_photos', 'pdf_excel'], required: true },
    fileName: { type: String, required: true },
    
    r2Path: { type: String },
    r2Url: { type: String },
    fileSize: { type: Number },
    generatedAt: { type: Date },
    expiresAt: { type: Date },
    
    status: { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GeneratedFileSchema.index({ jobId: 1, fileType: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['GeneratedFile'];
}

export const GeneratedFile =
  (mongoose.models.GeneratedFile as mongoose.Model<IGeneratedFile>) ||
  mongoose.model<IGeneratedFile>('GeneratedFile', GeneratedFileSchema);
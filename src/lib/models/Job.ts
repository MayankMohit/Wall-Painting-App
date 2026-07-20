import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IJob extends Document {
  _id: Types.ObjectId;
  companyName: string;
  
  // For the new format B and job type.
  jobType: 'Wall' | 'Shutter' | 'Van';
  pdfFormat: 'A' | 'B';
  
  ownerId: Types.ObjectId;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  painters: Types.ObjectId[];
  generatedExcel: Types.ObjectId | null;
  generatedPDFFile: Types.ObjectId | null;
  generatedPDFPhotos: Types.ObjectId | null;
  nextGeneratedNumber: number;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    companyName: { type: String, required: true, trim: true },
    jobType: { type: String, enum: ['Wall', 'Shutter', 'Van'], required: true },
    pdfFormat: { type: String, enum: ['A', 'B'], required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'completed', 'invoiced'], default: 'active' },
    painters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    generatedExcel: { type: Schema.Types.ObjectId, ref: 'GeneratedFile', default: null },
    generatedPDFFile: { type: Schema.Types.ObjectId, ref: 'GeneratedFile', default: null },
    generatedPDFPhotos: { type: Schema.Types.ObjectId, ref: 'GeneratedFile', default: null },
    nextGeneratedNumber: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

JobSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
JobSchema.index({ painters: 1, status: 1, createdAt: -1 });
JobSchema.index({ companyName: 'text' });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Job'];
}

export const Job = (mongoose.models.Job as mongoose.Model<IJob>) || mongoose.model<IJob>('Job', JobSchema);

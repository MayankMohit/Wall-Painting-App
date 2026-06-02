import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  requestId  : string;
  userId?    : string;
  userRole?  : 'painter' | 'owner' | 'admin';
  action     : string;
  resource?  : { type: string; id: string };
  ip         : string;
  userAgent? : string;
  statusCode : number;
  duration   : number;
  metadata?  : Record<string, unknown>;
  timestamp  : Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  requestId : { type: String, required: true, index: true },
  userId    : { type: String, index: true, sparse: true },
  userRole  : { type: String, enum: ['painter', 'owner', 'admin'] },
  action    : { type: String, required: true },
  resource  : { type: { type: String }, id: String },
  ip        : { type: String, required: true },
  userAgent : String,
  statusCode: { type: Number, required: true },
  duration  : Number,
  metadata  : Schema.Types.Mixed,
  timestamp : { type: Date, default: Date.now },
});

// Auto-delete after 90 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['AuditLog'];
}

export const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

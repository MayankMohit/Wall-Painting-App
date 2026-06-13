import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvite extends Document {
  _id: Types.ObjectId;
  tokenHash: string;          // sha256(token) — indexed lookup target for the public claim
  token: string;             // raw token, kept so the owner can re-share the link any time
  painterId: Types.ObjectId;  // ref User
  jobId: Types.ObjectId;      // ref Job
  ownerId: Types.ObjectId;    // ref User (creator, for listing/audit)
  status: 'active' | 'revoked';
  expiresAt: Date;            // now + INVITE_TTL_DAYS (default 30)
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    tokenHash:  { type: String, required: true, unique: true },
    token:      { type: String, required: true },
    painterId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId:      { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    ownerId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:     { type: String, enum: ['active', 'revoked'], default: 'active' },
    expiresAt:  { type: Date, required: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InviteSchema.index({ jobId: 1, painterId: 1 });
InviteSchema.index({ ownerId: 1, status: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Invite'];
}

export const Invite =
  (mongoose.models.Invite as mongoose.Model<IInvite>) ||
  mongoose.model<IInvite>('Invite', InviteSchema);

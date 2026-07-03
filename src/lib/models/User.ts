import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email?: string;     // optional — owner-provisioned painters have no email until they add one (Phase B)
  password?: string;  // optional — owner-provisioned painters have no password until they set one (Phase B)
  role: 'painter' | 'owner' | 'admin';
  name: string;
  phone: string;
  emailVerified: boolean;
  fcmTokens: string[];
  status: 'active' | 'inactive' | 'suspended';
  tokenVersion: number;  // bumped to invalidate all previously-issued JWTs (logout, password change, suspend)
  readOnly: boolean;     // demo/panel accounts: full read access, all write APIs blocked by middleware
  letterhead: { companyName: string; address: string } | null;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String },
    role: { type: String, enum: ['painter', 'owner', 'admin'], required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    fcmTokens: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    readOnly: { type: Boolean, default: false },
    letterhead: {
      type: { companyName: String, address: String },
      default: null,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, status: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['User'];
}

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

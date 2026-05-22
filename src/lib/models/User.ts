import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'painter' | 'owner' | 'admin';
  name: string;
  phone?: string;
  fcmTokens: string[];
  status: 'active' | 'inactive' | 'suspended';
  letterhead: { companyName: string; address: string } | null;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['painter', 'owner', 'admin'], required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    fcmTokens: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    letterhead: {
      type: { companyName: String, address: String },
      default: null,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, status: 1 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['User'];
}

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

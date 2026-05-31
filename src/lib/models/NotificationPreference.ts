import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotificationPreference extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  push:   Map<string, boolean>;
  email:  Map<string, boolean>;
  quietHours: { start: string; end: string; tz: string } | null;
  digest: boolean;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    push:   { type: Map, of: Boolean, default: () => new Map([['*', true]]) },
    email:  { type: Map, of: Boolean, default: () => new Map([['*', true]]) },
    quietHours: {
      type: {
        start: { type: String, required: true },
        end:   { type: String, required: true },
        tz:    { type: String, required: true },
      },
      default: null,
      _id: false,
    },
    digest: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['NotificationPreference'];
}

export const NotificationPreference =
  (mongoose.models.NotificationPreference as mongoose.Model<INotificationPreference>) ||
  mongoose.model<INotificationPreference>('NotificationPreference', NotificationPreferenceSchema);

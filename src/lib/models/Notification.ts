import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: String },
    title:   { type: String, required: true },
    body:    { type: String, required: true },
    data:    { type: Schema.Types.Mixed },
    readAt:  { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30-day TTL

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Notification'];
}

export const Notification =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

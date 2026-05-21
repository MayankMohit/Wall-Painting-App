import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);

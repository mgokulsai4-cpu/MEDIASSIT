import { Schema, model, InferSchemaType } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'appointment_confirmed',
  'appointment_reminder',
  'queue_update',
  'doctor_availability',
  'appointment_cancelled',
  'doctor_calling',
  'report_ready',
] as const;

const notificationSchema = new Schema({
  notification_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export type NotificationType = InferSchemaType<typeof notificationSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Notification = model('Notification', notificationSchema);

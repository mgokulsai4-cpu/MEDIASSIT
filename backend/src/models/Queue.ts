import { Schema, model, InferSchemaType } from 'mongoose';

const queueSchema = new Schema({
  queue_id: { type: String, required: true, unique: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  patient_id: { type: String, required: true, index: true },
  doctor_id: { type: String, required: true, index: true },
  queue_token: { type: String, required: true, unique: true },
  priority_score: { type: Number, required: true, default: 0 },
  urgency: { type: String, enum: ['green', 'yellow', 'orange', 'red'], default: 'green' },
  waiting_time: { type: Number, default: 0 },
  notified_position: { type: Number },
  status: {
    type: String,
    enum: ['waiting', 'called', 'in_consultation', 'completed', 'cancelled'],
    default: 'waiting',
  },
  override_reason: { type: String, default: '' },
  override_by: { type: String, default: '' },
  override_priority: { type: Number },
  called_at: { type: Date },
  completed_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

export type QueueType = InferSchemaType<typeof queueSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Queue = model('Queue', queueSchema);
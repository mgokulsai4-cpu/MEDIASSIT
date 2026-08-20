import { Schema, model, InferSchemaType } from 'mongoose';

const appointmentSchema = new Schema({
  appointment_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  doctor_id: { type: String, required: true, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  hospital: { type: String, default: '' },
  reason: { type: String, default: '' },
  urgency: { type: String, enum: ['green', 'yellow', 'orange', 'red'], default: 'green' },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_queue', 'in_consultation', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  reminder_sent_at: { type: Date },
  ai_assist: { type: Schema.Types.Mixed, default: null },
  created_at: { type: Date, default: Date.now },
});

export type AppointmentType = InferSchemaType<typeof appointmentSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Appointment = model('Appointment', appointmentSchema);

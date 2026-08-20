import { Schema, model, InferSchemaType } from 'mongoose';

const doctorNoteSchema = new Schema({
  note_id: { type: String, required: true, unique: true, index: true },
  doctor_id: { type: String, required: true, index: true },
  queue_id: { type: String, default: '', index: true },
  appointment_id: { type: String, default: '', index: true },
  patient_id: { type: String, required: true },
  content: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export type DoctorNoteType = InferSchemaType<typeof doctorNoteSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const DoctorNote = model('DoctorNote', doctorNoteSchema);

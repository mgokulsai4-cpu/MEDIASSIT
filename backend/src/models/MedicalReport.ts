import { Schema, model, InferSchemaType } from 'mongoose';

const reportSchema = new Schema({
  report_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  doctor_id: { type: String, required: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  symptoms: { type: [String], default: [] },
  clinical_observations: { type: String, default: '' },
  doctor_diagnosis: { type: String, required: true },
  treatment: { type: String, default: '' },
  prescription: { type: String, default: '' },
  follow_up: { type: String, default: '' },
  report_text: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export type MedicalReportType = InferSchemaType<typeof reportSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const MedicalReport = model('MedicalReport', reportSchema);
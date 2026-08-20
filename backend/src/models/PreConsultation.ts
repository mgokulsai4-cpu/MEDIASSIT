import { Schema, model, InferSchemaType } from 'mongoose';

const preConsultationSchema = new Schema({
  pc_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  conversation_id: { type: String, default: '' },
  chief_complaint: { type: String, default: '' },
  symptoms: { type: Schema.Types.Mixed, default: [] },
  medications: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  medical_history: { type: String, default: '' },
  lifestyle_notes: { type: String, default: '' },
  vital_signs: { type: Schema.Types.Mixed, default: {} },
  triage_context: { type: Schema.Types.Mixed, default: {} },
  clinical_summary: { type: String, default: '' },
  urgency: { type: String, enum: ['green', 'yellow', 'orange', 'red', ''], default: '' },
  answers: {
    type: [
      {
        key: { type: String, required: true },
        answer: { type: String, default: '' },
        rephrased: { type: Boolean, default: false },
      },
    ],
    default: [],
  },
  messages: {
    type: [
      {
        role: { type: String, required: true },
        text: { type: String, default: '' },
      },
    ],
    default: [],
  },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export type PreConsultationType = InferSchemaType<typeof preConsultationSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const PreConsultation = model('PreConsultation', preConsultationSchema);

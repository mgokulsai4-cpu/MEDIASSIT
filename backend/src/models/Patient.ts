import { Schema, model, InferSchemaType } from 'mongoose';

const patientSchema = new Schema({
  patient_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  blood_group: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    default: '',
  },
  existing_conditions: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  medical_history: { type: String, default: '' },
  emergency_contact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' },
  },
  created_at: { type: Date, default: Date.now },
});

export type PatientType = InferSchemaType<typeof patientSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Patient = model('Patient', patientSchema);
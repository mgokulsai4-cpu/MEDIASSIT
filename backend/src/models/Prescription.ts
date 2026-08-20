import { Schema, model, InferSchemaType } from 'mongoose';

const prescriptionSchema = new Schema({
  prescription_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  doctor_id: { type: String, required: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  medications: {
    type: [
      {
        name: { type: String, required: true },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        duration: { type: String, default: '' },
      },
    ],
    default: [],
  },
  instructions: { type: String, default: '' },
  follow_up_date: { type: String, default: '' },
  follow_up_notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
});

export type PrescriptionType = InferSchemaType<typeof prescriptionSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Prescription = model('Prescription', prescriptionSchema);
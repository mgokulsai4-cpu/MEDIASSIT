import { Schema, model, InferSchemaType } from 'mongoose';

const doctorSchema = new Schema({
  doctor_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  specialization: { type: String, required: true },
  department: { type: String, required: true },
  hospital: { type: String, default: '' },
  qualification: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  consultation_fee: { type: Number, default: 0 },
  room_number: { type: String, default: '' },
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  rating_count: { type: Number, default: 0 },
  availability: {
    type: [{ day: String, slots: [String] }],
    default: [],
  },
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  created_at: { type: Date, default: Date.now },
});

export type DoctorType = InferSchemaType<typeof doctorSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Doctor = model('Doctor', doctorSchema);

import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  push_tokens: {
    type: [
      {
        token: String,
        device_type: String,
        created_at: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  created_at: { type: Date, default: Date.now },
});

const userSchemaIndexes = userSchema.index({ email: 1, phone: 1 });
void userSchemaIndexes;

export type UserType = InferSchemaType<typeof userSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const User = model('User', userSchema);
import { Schema, model, InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['patient', 'assistant'], required: true },
    text: { type: String, required: true },
    ts: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new Schema({
  conversation_id: { type: String, required: true, unique: true, index: true },
  patient_id: { type: String, required: true, index: true },
  messages: { type: [messageSchema], default: [] },
  extracted_symptoms: { type: [{ name: String, category: String }], default: [] },
  follow_up_answers: {
    type: [
      {
        key: String,
        answer: String,
        question: String,
        rephrased: Boolean,
        answered_at: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  triage_result: { type: Schema.Types.Mixed },
  recommended_specialty: { type: String, default: '' },
  urgency: { type: String, enum: ['green', 'yellow', 'orange', 'red', ''], default: '' },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export type ConversationType = InferSchemaType<typeof conversationSchema> & {
  _id: import('mongoose').Types.ObjectId;
};

export const Conversation = model('Conversation', conversationSchema);
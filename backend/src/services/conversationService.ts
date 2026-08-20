import { Conversation } from '../models/Conversation.js';
import { nextId } from '../utils/idGen.js';

export interface MessageInput {
  role: 'patient' | 'assistant';
  text: string;
}

export interface AnswerRecord {
  key: string;
  answer: string;
  question: string;
  rephrased?: boolean;
}

export async function createConversation(patientId: string) {
  return Conversation.create({
    conversation_id: await nextId('C'),
    patient_id: patientId,
    status: 'active',
  });
}

export async function getConversation(conversationId: string) {
  return Conversation.findOne({ conversation_id: conversationId }).lean();
}

export async function appendMessage(conversationId: string, message: MessageInput) {
  return Conversation.updateOne(
    { conversation_id: conversationId },
    { $push: { messages: message }, $set: { updated_at: new Date() } },
  );
}

export async function setAnswer(conversationId: string, answer: AnswerRecord) {
  await Conversation.updateOne(
    { conversation_id: conversationId, 'follow_up_answers.key': answer.key },
    { $set: { 'follow_up_answers.$': answer, updated_at: new Date() } },
  );
  await Conversation.updateOne(
    { conversation_id: conversationId, 'follow_up_answers.key': { $ne: answer.key } },
    { $push: { follow_up_answers: answer }, $set: { updated_at: new Date() } },
  );
  return getConversation(conversationId);
}

export async function completeConversation(
  conversationId: string,
  data: {
    extracted_symptoms?: { name: string; category: string }[];
    triage_result?: unknown;
    recommended_specialty?: string;
    urgency?: string;
  },
) {
  return Conversation.updateOne(
    { conversation_id: conversationId },
    {
      $set: { ...data, status: 'completed', updated_at: new Date() },
      $push: { messages: { role: 'assistant', text: 'AI triage completed.' } },
    },
  );
}
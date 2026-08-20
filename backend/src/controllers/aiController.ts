import { Request, Response } from 'express';
import { aiChat, aiTriage, aiServiceHealthy } from '../services/aiClient.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import {
  appendMessage,
  completeConversation,
  createConversation,
  getConversation,
  setAnswer,
} from '../services/conversationService.js';

export async function handleHealth(req: Request, res: Response) {
  const aiOnline = await aiServiceHealthy();
  res.json({ success: true, data: { status: 'ok', ai_service: aiOnline ? 'online' : 'offline' } });
}

export async function handleChat(req: Request, res: Response) {
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.forbidden('Patient profile not found');

  const body = req.body as {
    conversation_id?: string;
    message?: string;
    answers?: { key: string; answer: string; rephrased?: boolean; question?: string }[];
    simple?: boolean;
  };
  const conversation_id = body.conversation_id ?? '';
  const message = (body.message ?? '').toString();
  const bodyAnswers = body.answers ?? [];
  const simple = body.simple === true;

  let conversation = conversation_id
    ? await getConversation(conversation_id)
    : await createConversation(patient.patient_id);
  if (!conversation) throw Errors.notFound('Conversation not found');
  if (conversation.patient_id !== patient.patient_id) {
    throw Errors.forbidden('This conversation belongs to another patient');
  }

  if (message.trim()) {
    await appendMessage(conversation.conversation_id, {
      role: 'patient',
      text: message.trim(),
    });
  }
  for (const a of bodyAnswers) {
    await setAnswer(conversation.conversation_id, {
      key: String(a.key),
      answer: String(a.answer),
      question: String(a.question ?? a.key ?? ''),
      rephrased: a.rephrased,
    });
  }

  const latest = await getConversation(conversation.conversation_id);
  const messages = (latest?.messages ?? []).map((m) => ({
    role: m.role,
    text: m.text,
  }));
  const answers = (latest?.follow_up_answers ?? []).map((a) => ({
    key: (a.key ?? '').toString(),
    answer: (a.answer ?? '').toString(),
    rephrased: Boolean((a as { rephrased?: boolean }).rephrased),
  }));

  const turn = await aiChat({
    conversation_id: conversation.conversation_id,
    patient_id: patient.patient_id,
    patient_context: {
      age: patient.age,
      gender: patient.gender,
      existing_conditions: patient.existing_conditions ?? [],
    },
    messages,
    answers,
    simple,
  });

  if (turn.type === 'result') {
    await completeConversation(conversation.conversation_id, {
      extracted_symptoms: turn.triage.symptoms,
      triage_result: turn.triage,
      recommended_specialty: turn.triage.recommended_specialties[0]?.code ?? '',
      urgency: turn.triage.urgency.level,
    });
  }

  res.json({
    success: true,
    data: { conversation_id: conversation.conversation_id, ...turn },
  });
}

export async function handleTriage(req: Request, res: Response) {
  const data = req.body as {
    messages: { role: string; text: string }[];
    answers?: { key: string; answer: string; rephrased?: boolean }[];
    patient_context?: {
      age?: number | null;
      gender?: string | null;
      existing_conditions?: string[];
    };
    simple?: boolean;
  };
  const turn = await aiTriage({
    messages: data.messages ?? [],
    answers: data.answers ?? [],
    patient_context: data.patient_context ?? undefined,
    simple: data.simple === true,
  });
  res.json({ success: true, data: turn });
}
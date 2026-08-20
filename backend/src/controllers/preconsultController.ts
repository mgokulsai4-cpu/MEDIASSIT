import { Request, Response } from 'express';
import { aiPreConsult, PreConsultTurn } from '../services/aiClient.js';
import {
  getOrCreatePreConsult,
  completePreConsult,
  savePreConsultSession,
  getPreConsultByAppointment,
  mergeAnswers,
  summaryFromRecord,
  StoredAnswer,
  StoredMessage,
} from '../services/preconsultService.js';
import { getPatientForUser } from '../services/patientService.js';
import { Appointment } from '../models/Appointment.js';
import { Conversation } from '../models/Conversation.js';
import { Doctor } from '../models/Doctor.js';
import { Errors } from '../utils/ApiError.js';

function toAnswers(raw: unknown): StoredAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object' && (item as { key?: string }).key)
    .map((item) => {
      const row = item as { key: string; answer?: string; rephrased?: boolean };
      return { key: String(row.key), answer: String(row.answer ?? ''), rephrased: Boolean(row.rephrased) };
    });
}

function toMessages(raw: unknown): StoredMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as { role?: string; text?: string };
      return { role: String(row.role || 'patient'), text: String(row.text || '') };
    })
    .filter((item) => item.text);
}

function appendAssistantQuestion(messages: StoredMessage[], turn: PreConsultTurn): StoredMessage[] {
  const text = turn.question?.text?.trim();
  if (!text) return messages;
  const last = messages[messages.length - 1];
  if (last?.role === 'assistant' && last.text === text) return messages;
  return [...messages, { role: 'assistant', text }];
}

async function latestTriage(patientId: string) {
  const conversation = await Conversation.findOne({ patient_id: patientId, status: 'completed' })
    .sort({ updated_at: -1 })
    .lean();
  return (conversation?.triage_result as Record<string, unknown> | undefined) ?? undefined;
}

export async function handleStartPreConsult(req: Request, res: Response) {
  const { appointment_id } = req.body as { appointment_id: string };
  if (!appointment_id) throw Errors.badRequest('appointment_id is required');
  if (req.user!.role !== 'patient') throw Errors.badRequest('Only patients can complete pre-consultation');

  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');

  const appointment = await Appointment.findOne({
    appointment_id,
    patient_id: patient.patient_id,
  }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');

  const pc = await getOrCreatePreConsult(patient.patient_id, appointment_id);
  const triageContext = (pc.triage_context as Record<string, unknown> | undefined) ?? (await latestTriage(patient.patient_id));

  if (pc.status === 'completed') {
    res.json({
      success: true,
      data: {
        pc_id: pc.pc_id,
        status: pc.status,
        type: 'result',
        done: true,
        preconsult_summary: summaryFromRecord(pc),
        messages: pc.messages ?? [],
        answers: pc.answers ?? [],
      },
    });
    return;
  }

  const messages = toMessages(pc.messages);
  const answers = toAnswers(pc.answers);
  const turn = await aiPreConsult({
    patient_id: patient.patient_id,
    appointment_id,
    triage_context: triageContext,
    patient_context: {
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      existing_conditions: patient.existing_conditions,
      allergies: patient.allergies,
    },
    messages,
    answers,
  });

  const nextMessages = appendAssistantQuestion(messages, turn);
  await savePreConsultSession(pc.pc_id, answers, nextMessages);

  res.json({
    success: true,
    data: {
      pc_id: pc.pc_id,
      status: pc.status,
      messages: nextMessages,
      answers,
      ...turn,
    },
  });
}

export async function handlePreConsultAnswer(req: Request, res: Response) {
  const { pc_id, message, answers } = req.body as {
    pc_id: string;
    message?: string;
    answers?: StoredAnswer[];
  };
  if (!pc_id) throw Errors.badRequest('pc_id is required');

  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');

  const existing = await (await import('../models/PreConsultation.js')).PreConsultation.findOne({
    pc_id,
    patient_id: patient.patient_id,
  }).lean();
  if (!existing) throw Errors.notFound('Pre-consultation not found');
  if (existing.status === 'completed') {
    res.json({
      success: true,
      data: {
        pc_id: existing.pc_id,
        status: existing.status,
        type: 'result',
        done: true,
        preconsult_summary: summaryFromRecord(existing),
        messages: existing.messages ?? [],
        answers: existing.answers ?? [],
      },
    });
    return;
  }

  let messages = toMessages(existing.messages);
  if (message?.trim()) {
    messages = [...messages, { role: 'patient', text: message.trim() }];
  }
  const mergedAnswers = mergeAnswers(toAnswers(existing.answers), toAnswers(answers));
  const triageContext = (existing.triage_context as Record<string, unknown> | undefined) ?? (await latestTriage(patient.patient_id));

  const turn: PreConsultTurn = await aiPreConsult({
    patient_id: patient.patient_id,
    appointment_id: existing.appointment_id,
    triage_context: triageContext,
    patient_context: {
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      existing_conditions: patient.existing_conditions,
      allergies: patient.allergies,
    },
    messages,
    answers: mergedAnswers,
  });

  const nextMessages = appendAssistantQuestion(messages, turn);

  if (turn.type === 'result' && turn.preconsult_summary) {
    await completePreConsult(pc_id, turn.preconsult_summary, nextMessages, mergedAnswers);
  } else {
    await savePreConsultSession(pc_id, mergedAnswers, nextMessages);
  }

  res.json({
    success: true,
    data: {
      pc_id,
      status: turn.type === 'result' ? 'completed' : 'in_progress',
      messages: nextMessages,
      answers: mergedAnswers,
      ...turn,
    },
  });
}

export async function handleGetPreConsult(req: Request, res: Response) {
  const appointmentId = String(req.params.appointmentId);
  if (!appointmentId) throw Errors.badRequest('appointmentId is required');

  const pc = await getPreConsultByAppointment(appointmentId);
  if (!pc) {
    res.json({ success: true, data: null });
    return;
  }

  if (req.user!.role === 'patient') {
    const patient = await getPatientForUser(req.user!.user_id);
    if (!patient || pc.patient_id !== patient.patient_id) throw Errors.forbidden();
  } else if (req.user!.role === 'doctor') {
    const appointment = await Appointment.findOne({ appointment_id: appointmentId }).lean();
    const doctor = await Doctor.findOne({ user_id: req.user!.user_id }).lean();
    if (!appointment || !doctor || appointment.doctor_id !== doctor.doctor_id) throw Errors.forbidden();
  }

  res.json({ success: true, data: pc });
}

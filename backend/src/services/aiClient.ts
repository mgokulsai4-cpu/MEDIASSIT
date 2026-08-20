import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { nextChatTurn } from './triage/engine.js';
import type { ChatTurn } from './triage/engineTypes.js';
import { extractiveSummary } from './reportSummarizer.js';

export interface AiChatPayload {
  conversation_id?: string;
  patient_id?: string;
  patient_context?: { age?: number | null; gender?: string | null; existing_conditions?: string[]; allergies?: string[] };
  messages: { role: string; text: string }[];
  answers: { key: string; answer: string; rephrased?: boolean }[];
  simple?: boolean;
}

export interface AiSummaryResult {
  ai_summary: unknown;
  model_used: string;
}

type QuestionTurn = Extract<ChatTurn, { type: 'question' }>;
type ResultTurn = Extract<ChatTurn, { type: 'result' }>;

async function post(path: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs);
  try {
    const res = await fetch(env.aiServiceUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('AI service HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function aiServiceHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(env.aiServiceUrl + '/health', { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeTurn(data: unknown): ChatTurn {
  if (!data || typeof data !== 'object') throw new Error('Unexpected AI response shape');
  const d = data as {
    type?: string;
    question?: QuestionTurn['question'];
    triage?: ResultTurn['triage'];
  };
  if (d.type === 'question' && d.question) {
    return { type: 'question', question: d.question, done: false };
  }
  if (d.type === 'result' && d.triage) {
    return { type: 'result', triage: d.triage };
  }
  throw new Error('Unexpected AI response shape');
}

export async function aiChat(payload: AiChatPayload): Promise<ChatTurn> {
  try {
    const data = await post('/ai/chat', payload);
    return normalizeTurn(data);
  } catch (err) {
    logger.warn('AI service unavailable - using local triage engine: ' + (err as Error).message);
    return nextChatTurn({
      messages: payload.messages,
      answers: payload.answers,
      patient: payload.patient_context,
      simple: payload.simple,
    });
  }
}

export async function aiTriage(payload: Omit<AiChatPayload, 'conversation_id'>): Promise<ChatTurn> {
  try {
    const data = await post('/ai/triage', payload);
    return normalizeTurn(data);
  } catch (err) {
    logger.warn('AI service unavailable for triage - using local engine: ' + (err as Error).message);
    return nextChatTurn({
      messages: payload.messages,
      answers: payload.answers,
      patient: payload.patient_context,
      simple: payload.simple,
    });
  }
}

export async function aiSummarizeReport(report: {
  report_text: string;
  doctor_diagnosis: string;
}): Promise<AiSummaryResult> {
  try {
    const data = (await post('/summarize', {
      text: report.report_text,
      diagnosis: report.doctor_diagnosis,
    })) as { ai_summary?: unknown; model_used?: string };
    return {
      ai_summary: data.ai_summary ?? extractiveSummary(report.report_text).ai_summary,
      model_used: data.model_used ?? 'extractive-heuristic-v1',
    };
  } catch (err) {
    logger.warn(
      'AI service unavailable for summarization - using extractive fallback: ' +
        (err as Error).message,
    );
    return extractiveSummary(report.report_text);
  }
}

export interface PreConsultPayload {
  patient_id?: string;
  appointment_id?: string;
  triage_context?: Record<string, unknown>;
  patient_context?: { age?: number | null; gender?: string | null; existing_conditions?: string[]; allergies?: string[] };
  messages: { role: string; text: string }[];
  answers: { key: string; answer: string; rephrased?: boolean }[];
}

export interface PreConsultTurn {
  type: 'question' | 'result';
  question?: {
    id: string;
    key: string;
    text: string;
    rephrased: boolean;
    options: { id: string; key: string; text: string; emoji: string }[];
  };
  preconsult_summary?: Record<string, unknown>;
  done: boolean;
}

const FALLBACK_PRECONSULT_QUESTIONS: NonNullable<PreConsultTurn['question']>[] = [
  {
    id: 'fallback_reason',
    key: 'fallback_reason',
    text: 'What is the main reason for this appointment?',
    rephrased: false,
    options: [
      { id: 'symptoms', key: 'fallback_reason.symptoms', text: 'I have symptoms', emoji: '' },
      { id: 'checkup', key: 'fallback_reason.checkup', text: 'Routine checkup', emoji: '' },
    ],
  },
  {
    id: 'fallback_severity',
    key: 'fallback_severity',
    text: 'How severe is it?',
    rephrased: false,
    options: [
      { id: 'mild', key: 'fallback_severity.mild', text: 'Mild', emoji: '' },
      { id: 'moderate', key: 'fallback_severity.moderate', text: 'Moderate', emoji: '' },
      { id: 'severe', key: 'fallback_severity.severe', text: 'Severe', emoji: '' },
    ],
  },
  {
    id: 'fallback_duration',
    key: 'fallback_duration',
    text: 'How long has this been happening?',
    rephrased: false,
    options: [
      { id: 'today', key: 'fallback_duration.today', text: 'Since today', emoji: '' },
      { id: 'days', key: 'fallback_duration.days', text: 'A few days', emoji: '' },
      { id: 'longer', key: 'fallback_duration.longer', text: 'More than a week', emoji: '' },
    ],
  },
];

function fallbackPreConsult(payload: PreConsultPayload): PreConsultTurn {
  const index = payload.answers.length;
  if (index < FALLBACK_PRECONSULT_QUESTIONS.length) {
    return { type: 'question', question: FALLBACK_PRECONSULT_QUESTIONS[index], done: false };
  }

  const patientText = payload.messages.filter((message) => message.role === 'patient').map((message) => message.text).join(' ');
  return {
    type: 'result',
    done: true,
    preconsult_summary: {
      chief_complaint: patientText || 'General consultation',
      symptoms: payload.answers.map((answer) => ({ duration: 'Not reported', severity: answer.answer, associated: '' })),
      medications: [],
      allergies: payload.patient_context?.allergies ?? [],
      medical_history: (payload.patient_context?.existing_conditions ?? []).join(', '),
      lifestyle_notes: '',
      vital_signs: {},
      clinical_summary: patientText || 'General consultation. Offline pre-consultation fallback was used.',
      urgency: 'green',
      triage_context: { source: 'local-preconsult-fallback', answers: payload.answers },
    },
  };
}

export async function aiPreConsult(payload: PreConsultPayload): Promise<PreConsultTurn> {
  try {
    const data = (await post('/ai/preconsult', payload)) as PreConsultTurn;
    return data;
  } catch (err) {
    logger.warn('AI preconsult unavailable: ' + (err as Error).message);
    return fallbackPreConsult(payload);
  }
}

export interface SlotRecommendPayload {
  urgency: string;
  recommended_specialties: { name: string; score: number }[];
  available_slots: {
    doctor_id: string;
    doctor_name: string;
    specialization: string;
    date: string;
    time: string;
    consultation_fee: number;
    rating: number;
    experience_years?: number;
    estimated_wait_minutes: number;
  }[];
}

export interface DiagnosePayload {
  patient: Record<string, unknown>;
  preconsult_summary: Record<string, unknown>;
  notes: Record<string, unknown>[];
  reason?: string;
  urgency?: string;
}

function fallbackDiagnose(payload: DiagnosePayload): Record<string, unknown> {
  const summary = payload.preconsult_summary || {};
  const complaint = String(summary.chief_complaint || payload.reason || '').toLowerCase();
  const urgency = String(summary.urgency || payload.urgency || 'green');
  const complex = urgency === 'red' || urgency === 'orange' || /chest|breath|heart/.test(complaint);
  return {
    difficulty: complex ? 'complex' : 'routine',
    diagnoses: complex
      ? [{ name: 'Needs bedside assessment', confidence: 0.3, rationale: 'Severity or red-flag language from pre-consult.' }]
      : [{ name: 'Common symptom-directed impression', confidence: 0.4, rationale: complaint || 'Limited history available.' }],
    prescription: complex ? [] : [{ drug: 'Supportive care', dose: 'As clinically appropriate', notes: 'Confirm allergies before any medicine.' }],
    assist_points: ['Review the AI pre-consult summary and examine the patient before acting.'],
    red_flags: complex ? ['Do not auto-prescribe until the patient is examined.'] : [],
    reasoning: complex
      ? 'Offline assist: this looks like a harder case, so only guidance is offered.'
      : 'Offline assist: a conservative draft plan is offered for the doctor to edit.',
    disclaimer: 'Decision support only. Confirm the history and examine the patient before diagnosing or prescribing.',
    generated_at: new Date().toISOString(),
    model_used: 'local-diagnose-fallback',
  };
}

export async function aiDiagnose(payload: DiagnosePayload): Promise<Record<string, unknown>> {
  try {
    return (await post('/ai/diagnose', payload)) as Record<string, unknown>;
  } catch (err) {
    logger.warn('AI diagnose unavailable: ' + (err as Error).message);
    return fallbackDiagnose(payload);
  }
}

export async function aiRecommendSlots(payload: SlotRecommendPayload): Promise<{ recommendations: Record<string, unknown>[] }> {
  try {
    const data = (await post('/ai/recommend-slots', payload)) as { recommendations: Record<string, unknown>[] };
    return data;
  } catch (err) {
    logger.warn('AI slot recommendation unavailable: ' + (err as Error).message);
    throw err;
  }
}

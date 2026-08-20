import { PreConsultation } from '../models/PreConsultation.js';
import { Appointment } from '../models/Appointment.js';
import { Queue } from '../models/Queue.js';
import { nextId } from '../utils/idGen.js';

export type StoredAnswer = { key: string; answer: string; rephrased?: boolean };
export type StoredMessage = { role: string; text: string };

export function mergeAnswers(existing: StoredAnswer[], incoming: StoredAnswer[]): StoredAnswer[] {
  const map = new Map<string, StoredAnswer>();
  for (const item of existing) map.set(item.key, item);
  for (const item of incoming) {
    if (!item?.key) continue;
    map.set(item.key, { key: item.key, answer: item.answer, rephrased: Boolean(item.rephrased) });
  }
  return [...map.values()];
}

export async function getOrCreatePreConsult(
  patientId: string,
  appointmentId: string,
) {
  let pc = await PreConsultation.findOne({
    patient_id: patientId,
    appointment_id: appointmentId,
  }).lean();

  if (!pc) {
    const pcId = await nextId('PC', 3);
    const created = await PreConsultation.create({
      pc_id: pcId,
      patient_id: patientId,
      appointment_id: appointmentId,
      status: 'in_progress',
      answers: [],
      messages: [],
    });
    return created.toObject();
  }

  return pc;
}

export async function savePreConsultSession(
  pcId: string,
  answers: StoredAnswer[],
  messages: StoredMessage[],
) {
  return PreConsultation.findOneAndUpdate(
    { pc_id: pcId },
    {
      $set: {
        answers,
        messages,
        updated_at: new Date(),
      },
    },
    { returnDocument: 'after' },
  ).lean();
}

export async function savePreConsultAnswers(
  pcId: string,
  answers: StoredAnswer[],
  messages: StoredMessage[],
) {
  return savePreConsultSession(pcId, answers, messages);
}

export function summaryFromRecord(pc: {
  chief_complaint?: string;
  symptoms?: unknown;
  medications?: string[];
  allergies?: string[];
  medical_history?: string;
  lifestyle_notes?: string;
  vital_signs?: unknown;
  triage_context?: unknown;
  clinical_summary?: string;
  urgency?: string;
}) {
  return {
    chief_complaint: pc.chief_complaint || '',
    symptoms: pc.symptoms || [],
    medications: pc.medications || [],
    allergies: pc.allergies || [],
    medical_history: pc.medical_history || '',
    lifestyle_notes: pc.lifestyle_notes || '',
    vital_signs: pc.vital_signs || {},
    triage_context: pc.triage_context || {},
    clinical_summary: pc.clinical_summary || '',
    urgency: pc.urgency || '',
  };
}

export async function completePreConsult(
  pcId: string,
  summary: Record<string, unknown>,
  messages: StoredMessage[],
  answers: StoredAnswer[],
) {
  const urgency = typeof summary.urgency === 'string' ? summary.urgency : '';
  const pc = await PreConsultation.findOneAndUpdate(
    { pc_id: pcId },
    {
      $set: {
        chief_complaint: summary.chief_complaint || '',
        symptoms: summary.symptoms || [],
        medications: summary.medications || [],
        allergies: summary.allergies || [],
        medical_history: summary.medical_history || '',
        lifestyle_notes: summary.lifestyle_notes || '',
        vital_signs: summary.vital_signs || {},
        triage_context: summary.triage_context || {},
        clinical_summary: summary.clinical_summary || '',
        urgency,
        answers,
        messages,
        status: 'completed',
        updated_at: new Date(),
      },
    },
    { returnDocument: 'after' },
  ).lean();

  if (pc?.appointment_id && urgency) {
    const appointment = await Appointment.findOne({ appointment_id: pc.appointment_id }).lean();
    if (appointment && (!appointment.urgency || appointment.urgency === 'green')) {
      await Appointment.updateOne({ appointment_id: pc.appointment_id }, { $set: { urgency } });
      const queue = await Queue.findOne({
        appointment_id: pc.appointment_id,
        status: { $in: ['waiting', 'called', 'in_consultation'] },
      }).lean();
      if (queue) {
        const weights: Record<string, number> = { red: 1000, orange: 600, yellow: 300, green: 100 };
        await Queue.updateOne(
          { queue_id: queue.queue_id },
          { $set: { urgency, priority_score: (weights[urgency] ?? 100) + (queue.priority_score % 100) } },
        );
      }
    }
  }

  return pc;
}

export async function getPreConsultByAppointment(appointmentId: string) {
  return PreConsultation.findOne({ appointment_id: appointmentId }).lean();
}

export async function getPreConsultByPatient(patientId: string) {
  return PreConsultation.find({ patient_id: patientId })
    .sort({ created_at: -1 })
    .lean();
}

export async function latestPatientUrgency(patientId: string): Promise<'green' | 'yellow' | 'orange' | 'red' | null> {
  const { Conversation } = await import('../models/Conversation.js');
  const [preconsult, conversation] = await Promise.all([
    PreConsultation.findOne({ patient_id: patientId, urgency: { $in: ['green', 'yellow', 'orange', 'red'] } })
      .sort({ updated_at: -1 })
      .lean(),
    Conversation.findOne({ patient_id: patientId, urgency: { $in: ['green', 'yellow', 'orange', 'red'] } })
      .sort({ updated_at: -1 })
      .lean(),
  ]);

  const preconsultAt = preconsult?.updated_at ? new Date(preconsult.updated_at).getTime() : 0;
  const conversationAt = conversation?.updated_at ? new Date(conversation.updated_at).getTime() : 0;
  const chosen = conversationAt > preconsultAt ? conversation?.urgency : preconsult?.urgency;
  if (chosen === 'green' || chosen === 'yellow' || chosen === 'orange' || chosen === 'red') {
    return chosen;
  }
  return null;
}

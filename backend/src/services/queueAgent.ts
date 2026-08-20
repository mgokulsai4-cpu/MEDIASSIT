import { Queue } from '../models/Queue.js';
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { logger } from '../utils/logger.js';
import { emitQueueUpdate } from './realtimeService.js';
import { notify } from './notificationService.js';
import { guidanceFor } from './urgencyGuidance.js';
import type { QueueType } from '../models/Queue.js';
import type { AppointmentType } from '../models/Appointment.js';
import type { PatientType } from '../models/Patient.js';
import type { DoctorType } from '../models/Doctor.js';

export const AVG_CONSULT_MINUTES = 15;

const URGENCY_WEIGHT: Record<string, number> = {
  red: 1000,
  orange: 600,
  yellow: 300,
  green: 100,
};

const ACTIVE_STATUSES = ['waiting', 'called', 'in_consultation'] as const;

interface QueueView extends QueueType {
  appointment?: AppointmentType | null;
  position?: number;
  patient?: PatientType | null;
  doctor?: { doctor_id: string; name: string; specialization: string } | null;
  appointment_time?: string;
  appointment_date?: string;
  estimated_wait_minutes?: number;
  priority_guidance?: ReturnType<typeof guidanceFor>;
}

function toQueueView(queue: QueueType, appt?: AppointmentType | null): QueueView {
  return { ...(queue as unknown as QueueType), appointment: appt ?? null };
}

function priorityScore(urgency: string, minutesWaiting: number, position: number): number {
  const base = URGENCY_WEIGHT[urgency] ?? 100;
  // Hospital-configured rule: urgency dominates, then time already waited,
  // then how many people are already ahead (FIFO tie-breaker).
  return base + Math.min(120, minutesWaiting * 2) + position * 2;
}

export async function joinQueue(appointmentId: string) {
  const appt = await Appointment.findOne({ appointment_id: appointmentId }).lean();
  if (!appt) throw Errors.notFound('Appointment not found');
  if (appt.status === 'cancelled') throw Errors.badRequest('A cancelled appointment cannot join the queue');

  const existing = await Queue.findOne({
    appointment_id: appointmentId,
    status: { $in: [...ACTIVE_STATUSES] },
  }).lean();
  if (existing) {
    return toQueueView(existing as unknown as QueueType, appt as unknown as AppointmentType);
  }

  const queue_token = await nextId('Q', 2);
  const ahead = await Queue.countDocuments({
    doctor_id: appt.doctor_id,
    status: { $in: [...ACTIVE_STATUSES] },
  });
  const score = priorityScore(appt.urgency, 0, ahead) + (ahead > 0 ? 1 : 0);

  const queue = await Queue.create({
    queue_id: queue_token,
    appointment_id: appointmentId,
    patient_id: appt.patient_id,
    doctor_id: appt.doctor_id,
    queue_token,
    priority_score: score,
    urgency: appt.urgency,
    waiting_time: 0,
    status: 'waiting',
  });

  await Appointment.updateOne({ appointment_id: appointmentId }, { status: 'in_queue' });
  logger.audit('queue-join', { queue_id: queue_token, appointment_id: appointmentId });
  await notifyQueuePositions(appt.doctor_id);
  emitQueueUpdate(queue_token, {
    queue_id: queue_token,
    position: 1,
    waiting_time: 0,
    status: 'waiting',
  });
  return toQueueView(queue.toObject(), null);
}

export async function notifyQueuePositions(doctorId: string): Promise<void> {
  const rows = await listDoctorQueue(doctorId);
  for (const row of rows) {
    if (row.status !== 'waiting' || row.position == null) continue;
    if (row.notified_position === row.position) continue;
    const patient = await Patient.findOne({ patient_id: row.patient_id }).select('user_id').lean();
    if (patient?.user_id) {
      await notify.queueUpdate(patient.user_id, row.queue_id, row.position, row.waiting_time ?? 0);
    }
    await Queue.updateOne({ queue_id: row.queue_id }, { $set: { notified_position: row.position } });
  }
}

export async function findQueue(queueId: string): Promise<QueueView> {
  const queue = await Queue.findOne({ queue_id: queueId }).lean();
  if (!queue) throw Errors.notFound('Queue entry not found');
  const appt = await Appointment.findOne({ appointment_id: queue.appointment_id }).lean();
  const doctorQueue = await listDoctorQueue(queue.doctor_id);
  const current = doctorQueue.find((entry) => entry.queue_id === queueId);
  return {
    ...toQueueView(queue as unknown as QueueType, (appt as unknown as AppointmentType) ?? null),
    position: current?.position,
    waiting_time: current?.waiting_time ?? queue.waiting_time,
    estimated_wait_minutes: current?.waiting_time ?? queue.waiting_time,
    urgency: queue.urgency,
    priority_guidance: guidanceFor(queue.urgency),
    appointment_time: appt?.time,
    appointment_date: appt?.date,
  };
}

export async function listDoctorQueue(doctorId: string): Promise<QueueView[]> {
  const rows = await Queue.find({
    doctor_id: doctorId,
    status: { $in: [...ACTIVE_STATUSES] },
  })
    .sort({ priority_score: -1, created_at: 1 })
    .lean();
  const appts = await Appointment.find({
    appointment_id: { $in: rows.map((r) => r.appointment_id) },
  }).lean();
  const apptMap = new Map(appts.map((a) => [a.appointment_id, a]));
  const patients = await Patient.find({
    patient_id: { $in: appts.map((a) => a.patient_id) },
  }).lean();
  const patientMap = new Map(patients.map((p) => [p.patient_id, p]));

  return rows.map((row, i) => {
    const appt = apptMap.get(row.appointment_id);
    const p = patientMap.get(row.patient_id);
    return {
      ...(row as unknown as QueueType),
      position: i + 1,
      waiting_time: i * AVG_CONSULT_MINUTES,
      estimated_wait_minutes: i * AVG_CONSULT_MINUTES,
      patient: p ?? null,
      priority_guidance: guidanceFor(row.urgency),
      appointment_time: appt?.time,
      appointment_date: appt?.date,
    };
  });
}

export async function listPatientQueue(patientId: string): Promise<QueueView | null> {
  const rows = await Queue.find({
    patient_id: patientId,
    status: { $in: [...ACTIVE_STATUSES] },
  })
    .sort({ created_at: -1 })
    .lean();
  if (rows.length === 0) return null;
  const row = rows[0];
  const full = await listDoctorQueue(row.doctor_id);
  const index = full.findIndex((q) => q.queue_id === row.queue_id);
  const doctor = await Doctor.findOne({ doctor_id: row.doctor_id })
    .select('doctor_id name specialization department')
    .lean();
  return {
    ...(row as unknown as QueueType),
    position: index >= 0 ? index + 1 : 1,
    waiting_time: index >= 0 ? index * AVG_CONSULT_MINUTES : 0,
    estimated_wait_minutes: index >= 0 ? index * AVG_CONSULT_MINUTES : 0,
    priority_guidance: guidanceFor(row.urgency),
    doctor,
  };
}

export async function updateQueueStatus(queueId: string, status: string): Promise<QueueView> {
  const allowed = ['called', 'in_consultation', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw Errors.badRequest('Invalid queue status');
  const queue = await Queue.findOne({ queue_id: queueId }).lean();
  if (!queue) throw Errors.notFound('Queue entry not found');

  const update: Record<string, unknown> = { status };
  if (status === 'called') update.called_at = new Date();
  if (status === 'completed' || status === 'cancelled') update.completed_at = new Date();
  await Queue.updateOne({ queue_id: queueId }, { $set: update });

  if (status === 'completed') {
    await Appointment.updateOne({ appointment_id: queue.appointment_id }, { status: 'completed' });
    const appt = await Appointment.findOne({ appointment_id: queue.appointment_id }).lean();
    if (appt) {
      await Appointment.updateMany(
        { doctor_id: appt.doctor_id, date: appt.date, status: 'in_queue' },
        { $set: { status: 'confirmed' } },
      );
    }
  }
  if (status === 'cancelled') {
    await Appointment.updateOne({ appointment_id: queue.appointment_id }, { status: 'confirmed' });
  }
  logger.audit('queue-status-change', { queue_id: queueId, status });
  await notifyQueuePositions(queue.doctor_id);
  const updated = await findQueue(queueId);
  emitQueueUpdate(queueId, {
    queue_id: queueId,
    position: updated.position,
    waiting_time: updated.waiting_time,
    status,
  });
  return updated;
}

export async function overridePriority(
  queueId: string,
  newScore: number,
  actor: string,
  reason: string,
): Promise<QueueView> {
  const queue = await Queue.findOne({ queue_id: queueId }).lean();
  if (!queue) throw Errors.notFound('Queue entry not found');
  if (!Number.isFinite(newScore) || newScore <= 0) {
    throw Errors.badRequest('Priority score must be a positive number');
  }
  await Queue.updateOne(
    { queue_id: queueId },
    {
      $set: {
        priority_score: newScore,
        override_priority: newScore,
        override_reason: reason,
        override_by: actor,
      },
    },
  );
  logger.audit('queue-override', { queue_id: queueId, actor, reason });
  await notifyQueuePositions(queue.doctor_id);
  return findQueue(queueId);
}

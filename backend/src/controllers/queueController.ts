import { Request, Response } from 'express';
import {
  joinQueue,
  findQueue,
  listDoctorQueue,
  listPatientQueue,
  updateQueueStatus,
  overridePriority,
} from '../services/queueAgent.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import { Patient } from '../models/Patient.js';
import { notify } from '../services/notificationService.js';

async function getUserIdFromPatientId(patientId: string): Promise<string | undefined> {
  const patient = await Patient.findOne({ patient_id: patientId }).select('user_id').lean();
  return patient?.user_id;
}

export async function handleActiveQueue(req: Request, res: Response) {
  if (req.user!.role !== 'patient') throw Errors.badRequest('Only patients have active queue entries');
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');
  const entry = await listPatientQueue(patient.patient_id);
  res.json({ entries: entry ? [entry] : [] });
}

export async function handleJoinQueue(req: Request, res: Response) {
  const { appointment_id } = req.body as { appointment_id: string };
  if (!appointment_id) throw Errors.badRequest('appointment_id is required');
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    const queue = await listPatientQueue(own?.patient_id ?? '');
    void queue;
  }
  const queue = await joinQueue(appointment_id);
  res.status(201).json({ success: true, data: queue });
}

export async function handleGetQueue(req: Request, res: Response) {
  res.json({ success: true, data: await findQueue(String(req.params.id)) });
}

export async function handlePatientCancelQueue(req: Request, res: Response) {
  if (req.user!.role !== 'patient') throw Errors.forbidden('Only patients can leave their queue');
  const queue = await findQueue(String(req.params.id));
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient || queue.patient_id !== patient.patient_id) throw Errors.forbidden();
  const updated = await updateQueueStatus(String(req.params.id), 'cancelled');
  res.json({ success: true, data: updated });
}

export async function handleDoctorQueue(req: Request, res: Response) {
  const rows = await listDoctorQueue(String(req.params.doctorId));
  res.json({ success: true, data: rows });
}

export async function handlePatientQueue(req: Request, res: Response) {
  const patientId = String(req.params.patientId) as string;
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    if (!own || own.patient_id !== patientId) throw Errors.forbidden();
  }
  const queue = await listPatientQueue(patientId);
  res.json({ success: true, data: queue });
}

export async function handleUpdateQueue(req: Request, res: Response) {
  const queue = await updateQueueStatus(String(req.params.id), (req.body.status as string) ?? '');
  if (req.body.status === 'called') {
    const userId = await getUserIdFromPatientId(queue.patient_id || '');
    if (userId) void notify.doctorCalling(userId, queue.queue_id);
  }
  if (queue.position !== undefined && queue.position > 0) {
    const userId = await getUserIdFromPatientId(queue.patient_id || '');
    if (userId) {
      void notify.queueUpdate(
        userId,
        queue.queue_id || '',
        queue.position,
        queue.waiting_time || 0,
      );
    }
  }
  res.json({ success: true, data: queue });
}

export async function handleOverridePriority(req: Request, res: Response) {
  const queue = await overridePriority(
    String(req.params.id),
    Number(req.body.priority_score),
    req.user!.user_id,
    (req.body.reason as string) ?? 'manual override',
  );
  res.json({ success: true, data: queue });
}

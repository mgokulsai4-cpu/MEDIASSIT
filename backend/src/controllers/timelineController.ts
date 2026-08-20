import { Request, Response } from 'express';
import { getPatientTimeline } from '../services/timelineService.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import { canAccessPatient } from '../services/familyService.js';

export async function handleOwnTimeline(req: Request, res: Response) {
  if (req.user!.role !== 'patient') throw Errors.forbidden('Only patients have health timelines');
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');
  res.json({ success: true, data: await getPatientTimeline(patient.patient_id) });
}

export async function handlePatientTimeline(req: Request, res: Response) {
  const patientId = String(req.params.patientId);
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    const allowed = own && (own.patient_id === patientId || (await canAccessPatient(req.user!.user_id, patientId)));
    if (!allowed) throw Errors.forbidden();
  }
  res.json({ success: true, data: await getPatientTimeline(patientId) });
}
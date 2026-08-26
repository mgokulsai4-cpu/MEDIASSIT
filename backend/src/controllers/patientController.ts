import { Request, Response } from 'express';
import {
  getPatientByPatientId,
  getPatientForUser,
  updatePatientProfile,
} from '../services/patientService.js';
import { registerPushToken } from '../services/notificationService.js';
import { Errors } from '../utils/ApiError.js';

export async function handleGetProfile(req: Request, res: Response) {
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient profile not found');
  res.json({ success: true, data: { patient } });
}

export async function handleGetProfileById(req: Request, res: Response) {
  const patient = await getPatientByPatientId(String(req.params.id));
  if (req.user!.role === 'patient' && patient.user_id !== req.user!.user_id) {
    throw Errors.forbidden('Cannot access other patients profiles');
  }
  res.json({ success: true, data: { patient } });
}

export async function handleUpdateProfile(req: Request, res: Response) {
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient profile not found');
  const updated = await updatePatientProfile(patient.patient_id, req.body);
  res.json({ success: true, data: { patient: updated } });
}

export async function handleRegisterPushToken(req: Request, res: Response) {
  const token = (req.body.token ?? '').toString();
  const deviceType = (req.body.device_type ?? 'unknown').toString().slice(0, 32);
  if (!token) throw Errors.badRequest('Expo push token is required');
  await registerPushToken(req.user!.user_id, token, deviceType);
  res.json({ success: true, message: 'Push token registered' });
}
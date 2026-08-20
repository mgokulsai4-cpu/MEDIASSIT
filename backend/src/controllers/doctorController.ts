import { Request, Response } from 'express';
import { listDoctors, getDoctor, getAvailability, getDoctorForUser, updateDoctorProfile, updateDoctorStatus } from '../services/doctorService.js';
import { Errors } from '../utils/ApiError.js';

export async function handleListDoctors(req: Request, res: Response) {
  const specialty = (req.query.specialty as string) || undefined;
  const doctors = await listDoctors(specialty);
  res.json({ success: true, data: doctors });
}

export async function handleGetDoctor(req: Request, res: Response) {
  const doctor = await getDoctor(String(req.params.id));
  res.json({ success: true, data: doctor });
}

export async function handleAvailability(req: Request, res: Response) {
  const date = req.query.date as string | undefined;
  const availability = await getAvailability(String(req.params.id), date);
  res.json({ success: true, data: availability });
}

export async function handleGetMyDoctor(req: Request, res: Response) {
  if (req.user!.role !== 'doctor') throw Errors.forbidden('Only doctors can access doctor profile');
  res.json({ success: true, data: { doctor: await getDoctorForUser(req.user!.user_id) } });
}

export async function handleUpdateMyDoctor(req: Request, res: Response) {
  if (req.user!.role !== 'doctor') throw Errors.forbidden('Only doctors can update doctor profile');
  const doctor = await updateDoctorProfile(req.user!.user_id, req.body);
  res.json({ success: true, data: { doctor } });
}

export async function handleUpdateMyStatus(req: Request, res: Response) {
  if (req.user!.role !== 'doctor') throw Errors.forbidden('Only doctors can update status');
  const status = req.body.status as 'available' | 'busy' | 'offline';
  if (!['available', 'busy', 'offline'].includes(status)) throw Errors.badRequest('Invalid status');
  const doctor = await updateDoctorStatus(req.user!.user_id, status);
  res.json({ success: true, data: { doctor } });
}

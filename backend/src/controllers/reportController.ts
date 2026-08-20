import { Request, Response } from 'express';
import {
  createReport,
  listPatientReports,
  listDoctorReports,
  getReport,
  summarizeReport,
} from '../services/reportAgent.js';
import { Doctor } from '../models/Doctor.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import { canAccessPatient } from '../services/familyService.js';

async function canReadPatient(userId: string, patientId: string): Promise<boolean> {
  const own = await getPatientForUser(userId);
  return !!own && (own.patient_id === patientId || (await canAccessPatient(userId, patientId)));
}

async function doctorRecordForSession(userId: string) {
  const doctor = await Doctor.findOne({ user_id: userId }).select('doctor_id').lean();
  if (!doctor) throw Errors.forbidden('Doctor profile not found for this account');
  return doctor;
}

export async function handleCreateReport(req: Request, res: Response) {
  const doctor = await doctorRecordForSession(req.user!.user_id);
  const report = await createReport({ ...req.body, doctor_id: doctor.doctor_id });
  res.status(201).json({ success: true, data: report });
}

export async function handleListReports(req: Request, res: Response) {
  const patientId = String(req.params.patientId) as string;
  if (req.user!.role === 'patient') {
    if (!(await canReadPatient(req.user!.user_id, patientId))) throw Errors.forbidden();
  }
  res.json({ success: true, data: await listPatientReports(patientId) });
}

export async function handleListDoctorReports(req: Request, res: Response) {
  const doctor = await doctorRecordForSession(req.user!.user_id);
  res.json({ success: true, data: await listDoctorReports(doctor.doctor_id) });
}

export async function handleGetReport(req: Request, res: Response) {
  const report = await getReport(String(req.params.id));
  if (req.user!.role === 'patient') {
    if (!(await canReadPatient(req.user!.user_id, report.patient_id))) throw Errors.forbidden();
  }
  if (req.user!.role === 'doctor') {
    const doctor = await doctorRecordForSession(req.user!.user_id);
    if (report.doctor_id !== doctor.doctor_id) throw Errors.forbidden();
  }
  res.json({ success: true, data: report });
}

export async function handleSummarizeReport(req: Request, res: Response) {
  const summary = await summarizeReport(String(req.params.id));
  res.json({ success: true, data: summary });
}
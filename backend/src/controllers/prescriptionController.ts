import { Request, Response } from 'express';
import {
  createPrescription,
  getPrescription,
  listDoctorPrescriptions,
  listPatientPrescriptions,
  type PrescriptionInput,
} from '../services/prescriptionService.js';
import { Doctor } from '../models/Doctor.js';
import { Errors } from '../utils/ApiError.js';
import { getPatientForUser } from '../services/patientService.js';
import { canAccessPatient } from '../services/familyService.js';

async function doctorRecordForSession(userId: string) {
  const doctor = await Doctor.findOne({ user_id: userId }).select('doctor_id').lean();
  if (!doctor) throw Errors.forbidden('Doctor profile not found for this account');
  return doctor;
}

export async function handleCreatePrescription(req: Request, res: Response) {
  const doctor = await doctorRecordForSession(req.user!.user_id);
  const body = req.body as Omit<PrescriptionInput, 'doctor_id'>;
  const prescription = await createPrescription({ ...body, doctor_id: doctor.doctor_id });
  res.status(201).json({ success: true, data: prescription });
}

export async function handleGetPrescription(req: Request, res: Response) {
  const prescription = await getPrescription(String(req.params.id));
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    const allowed = own && (own.patient_id === prescription.patient_id || (await canAccessPatient(req.user!.user_id, prescription.patient_id)));
    if (!allowed) throw Errors.forbidden();
  }
  if (req.user!.role === 'doctor') {
    const doctor = await doctorRecordForSession(req.user!.user_id);
    if (prescription.doctor_id !== doctor.doctor_id) throw Errors.forbidden();
  }
  res.json({ success: true, data: prescription });
}

export async function handleListOwnPrescriptions(req: Request, res: Response) {
  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');
  res.json({ success: true, data: await listPatientPrescriptions(patient.patient_id) });
}

export async function handleListPatientPrescriptions(req: Request, res: Response) {
  const patientId = String(req.params.patientId);
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    const allowed = own && (own.patient_id === patientId || (await canAccessPatient(req.user!.user_id, patientId)));
    if (!allowed) throw Errors.forbidden();
  }
  res.json({ success: true, data: await listPatientPrescriptions(patientId) });
}

export async function handleListDoctorPrescriptions(req: Request, res: Response) {
  const doctor = await doctorRecordForSession(req.user!.user_id);
  res.json({ success: true, data: await listDoctorPrescriptions(doctor.doctor_id) });
}
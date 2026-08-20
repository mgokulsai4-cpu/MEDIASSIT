import { Prescription } from '../models/Prescription.js';
import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { logger } from '../utils/logger.js';
import { sendToUser } from './notificationService.js';
import { User } from '../models/User.js';

export interface PrescriptionInput {
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  medications?: { name: string; dosage?: string; frequency?: string; duration?: string }[];
  instructions?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
}

export async function createPrescription(input: PrescriptionInput) {
  const appointment = await Appointment.findOne({ appointment_id: input.appointment_id }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');
  if (appointment.doctor_id !== input.doctor_id) {
    throw Errors.badRequest('This appointment belongs to another doctor');
  }
  const patient = await Patient.findOne({ patient_id: input.patient_id }).lean();
  if (!patient) throw Errors.notFound('Patient not found');

  const prescription_id = await nextId('Px');
  const prescription = await Prescription.create({
    prescription_id,
    patient_id: input.patient_id,
    doctor_id: input.doctor_id,
    appointment_id: input.appointment_id,
    medications: input.medications ?? [],
    instructions: input.instructions ?? '',
    follow_up_date: input.follow_up_date ?? '',
    follow_up_notes: input.follow_up_notes ?? '',
  });

  const patientUser = await User.findOne({ user_id: patient.user_id }).select('user_id').lean();
  void sendToUser(patientUser?.user_id ?? patient.user_id, {
    title: 'New Prescription',
    body: 'Your doctor has shared a prescription with you.',
    data: { type: 'prescription', prescription_id },
  });
  logger.audit('prescription-create', { prescription_id, patient_id: input.patient_id, doctor_id: input.doctor_id });
  return prescription;
}

export async function getPrescription(prescriptionId: string) {
  const prescription = await Prescription.findOne({ prescription_id: prescriptionId }).lean();
  if (!prescription) throw Errors.notFound('Prescription not found');
  const patient = await Patient.findOne({ patient_id: prescription.patient_id }).lean();
  const doctor = await Doctor.findOne({ doctor_id: prescription.doctor_id })
    .select('doctor_id name specialization')
    .lean();
  return { ...prescription, patient, doctor };
}

export async function listPatientPrescriptions(patientId: string) {
  const rows = await Prescription.find({ patient_id: patientId }).sort({ created_at: -1 }).lean();
  const doctorIds = [...new Set(rows.map((r) => r.doctor_id))];
  const doctors = await Doctor.find({ doctor_id: { $in: doctorIds } })
    .select('doctor_id name specialization')
    .lean();
  const map = new Map(doctors.map((d) => [d.doctor_id, d]));
  return rows.map((r) => ({ ...r, doctor: map.get(r.doctor_id) ?? null }));
}

export async function listDoctorPrescriptions(doctorId: string) {
  return Prescription.find({ doctor_id: doctorId }).sort({ created_at: -1 }).lean();
}
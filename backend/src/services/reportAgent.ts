import { MedicalReport } from '../models/MedicalReport.js';
import { ReportSummary } from '../models/ReportSummary.js';
import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { aiSummarizeReport } from './aiClient.js';
import { notify } from './notificationService.js';
import { logger } from '../utils/logger.js';

export interface CreateReportInput {
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  symptoms?: string[];
  clinical_observations?: string;
  doctor_diagnosis: string;
  treatment?: string;
  prescription?: string;
  follow_up?: string;
}

function buildReportText(input: CreateReportInput): string {
  const lines: string[] = [];
  lines.push('Symptoms: ' + (input.symptoms?.join(', ') || 'Not specified'));
  lines.push('Clinical Observations: ' + (input.clinical_observations || 'Not specified'));
  lines.push('Diagnosis: ' + input.doctor_diagnosis);
  lines.push('Treatment: ' + (input.treatment || 'Not specified'));
  lines.push('Prescription: ' + (input.prescription || 'Not specified'));
  lines.push('Follow-up: ' + (input.follow_up || 'Not specified'));
  return lines.join(String.fromCharCode(10));
}

export async function createReport(input: CreateReportInput) {
  if (!input.doctor_diagnosis || !input.doctor_diagnosis.trim()) {
    throw Errors.badRequest('Doctor diagnosis is required. Only a doctor can record a diagnosis.');
  }
  const patient = await Patient.findOne({ patient_id: input.patient_id }).lean();
  if (!patient) throw Errors.notFound('Patient not found');
  const appointment = await Appointment.findOne({ appointment_id: input.appointment_id }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');
  if (appointment.doctor_id !== input.doctor_id) {
    throw Errors.badRequest('This appointment belongs to another doctor');
  }

  const report_id = await nextId('R');
  const report = await MedicalReport.create({
    report_id,
    patient_id: input.patient_id,
    doctor_id: input.doctor_id,
    appointment_id: input.appointment_id,
    symptoms: input.symptoms ?? [],
    clinical_observations: input.clinical_observations ?? '',
    doctor_diagnosis: input.doctor_diagnosis,
    treatment: input.treatment ?? '',
    prescription: input.prescription ?? '',
    follow_up: input.follow_up ?? '',
    report_text: buildReportText(input),
  });

  await Appointment.updateOne({ appointment_id: input.appointment_id }, { status: 'completed' });
  const patientUser = await User.findOne({ user_id: patient.user_id }).select('user_id').lean();
  void notify.reportReady(patientUser?.user_id ?? patient.user_id, report_id);
  logger.audit('report-create', { report_id, patient_id: input.patient_id, doctor_id: input.doctor_id });
  return report;
}

export async function listPatientReports(patientId: string) {
  const reports = await MedicalReport.find({ patient_id: patientId }).sort({ created_at: -1 }).lean();
  const doctorIds = [...new Set(reports.map((r) => r.doctor_id))];
  const doctors = await Doctor.find({ doctor_id: { $in: doctorIds } })
    .select('doctor_id name specialization')
    .lean();
  const map = new Map(doctors.map((d) => [d.doctor_id, d]));
  return reports.map((r) => ({ ...r, doctor: map.get(r.doctor_id) ?? null }));
}

export async function listDoctorReports(doctorId: string) {
  return MedicalReport.find({ doctor_id: doctorId }).sort({ created_at: -1 }).lean();
}

export async function getReport(reportId: string) {
  const report = await MedicalReport.findOne({ report_id: reportId }).lean();
  if (!report) throw Errors.notFound('Report not found');
  const patient = await Patient.findOne({ patient_id: report.patient_id }).lean();
  const doctor = await Doctor.findOne({ doctor_id: report.doctor_id })
    .select('doctor_id name specialization')
    .lean();
  const summary = await ReportSummary.findOne({ report_id: reportId }).sort({ generated_at: -1 }).lean();
  return { ...report, patient, doctor, summary };
}

export async function summarizeReport(reportId: string) {
  const report = await MedicalReport.findOne({ report_id: reportId }).lean();
  if (!report) throw Errors.notFound('Report not found');
  const existing = await ReportSummary.findOne({ report_id: reportId }).sort({ generated_at: -1 }).lean();
  if (existing) return existing;

  const result = await aiSummarizeReport(report);
  const summary = await ReportSummary.create({
    summary_id: await nextId('S'),
    report_id: reportId,
    ai_summary: result.ai_summary,
    model_used: result.model_used,
  });
  logger.audit('report-summarize', { report_id: reportId, model_used: result.model_used });
  return summary;
}
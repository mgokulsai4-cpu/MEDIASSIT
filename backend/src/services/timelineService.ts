import { Appointment } from '../models/Appointment.js';
import { MedicalReport } from '../models/MedicalReport.js';
import { Prescription } from '../models/Prescription.js';
import { PreConsultation } from '../models/PreConsultation.js';
import { Conversation } from '../models/Conversation.js';
import { Doctor } from '../models/Doctor.js';

export interface TimelineEntry {
  type: 'appointment' | 'report' | 'prescription' | 'preconsult' | 'triage';
  id: string;
  date: string;
  title: string;
  subtitle: string;
  doctor_name?: string;
  status?: string;
  link: string;
}

export async function getPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
  const [appointments, reports, prescriptions, preconsults, conversations] = await Promise.all([
    Appointment.find({ patient_id: patientId }).lean(),
    MedicalReport.find({ patient_id: patientId }).lean(),
    Prescription.find({ patient_id: patientId }).lean(),
    PreConsultation.find({ patient_id: patientId }).lean(),
    Conversation.find({ patient_id: patientId }).sort({ created_at: -1 }).limit(20).lean(),
  ]);

  const doctorIds = [
    ...new Set([
      ...appointments.map((a) => a.doctor_id),
      ...reports.map((r) => r.doctor_id),
      ...prescriptions.map((p) => p.doctor_id),
    ]),
  ];
  const doctors = await Doctor.find({ doctor_id: { $in: doctorIds } })
    .select('doctor_id name specialization')
    .lean();
  const doctorMap = new Map(doctors.map((d) => [d.doctor_id, d]));

  const entries: TimelineEntry[] = [];

  for (const appt of appointments) {
    entries.push({
      type: 'appointment',
      id: appt.appointment_id,
      date: appt.date,
      title: 'Appointment ' + (appt.time ?? ''),
      subtitle: (doctorMap.get(appt.doctor_id)?.specialization ?? 'Doctor') + ' visit',
      doctor_name: doctorMap.get(appt.doctor_id)?.name,
      status: appt.status,
      link: '/appointments',
    });
  }

  for (const report of reports) {
    entries.push({
      type: 'report',
      id: report.report_id,
      date: report.created_at ? new Date(report.created_at).toISOString().slice(0, 10) : '',
      title: report.doctor_diagnosis || 'Medical report',
      subtitle: 'Medical report with AI summary',
      doctor_name: doctorMap.get(report.doctor_id)?.name,
      status: 'ready',
      link: '/reports/' + report.report_id,
    });
  }

  for (const prescription of prescriptions) {
    entries.push({
      type: 'prescription',
      id: prescription.prescription_id,
      date: prescription.created_at ? new Date(prescription.created_at).toISOString().slice(0, 10) : '',
      title: 'Prescription',
      subtitle: (prescription.medications ?? []).map((m) => m.name).join(', ') || 'Medication prescription',
      doctor_name: doctorMap.get(prescription.doctor_id)?.name,
      link: '/prescriptions/' + prescription.prescription_id,
    });
  }

  for (const pc of preconsults) {
    entries.push({
      type: 'preconsult',
      id: pc.pc_id,
      date: pc.updated_at ? new Date(pc.updated_at).toISOString().slice(0, 10) : '',
      title: 'Pre-consultation',
      subtitle: pc.chief_complaint || 'Pre-visit questionnaire',
      status: pc.status,
      link: '/appointments',
    });
  }

  for (const conv of conversations) {
    const triage = conv.triage_result as { urgency?: { level?: string; label?: string } } | undefined;
    entries.push({
      type: 'triage',
      id: conv.conversation_id,
      date: conv.created_at ? new Date(conv.created_at).toISOString().slice(0, 10) : '',
      title: 'Symptom triage',
      subtitle: triage?.urgency?.label ?? 'AI triage conversation',
      status: triage?.urgency?.level,
      link: '/ai-chat',
    });
  }

  return entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
}
import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Appointment } from '../models/Appointment.js';
import { Queue } from '../models/Queue.js';
import { MedicalReport } from '../models/MedicalReport.js';
import { PreConsultation } from '../models/PreConsultation.js';
import { DoctorNote } from '../models/DoctorNote.js';
import { Conversation } from '../models/Conversation.js';
import { getDoctorForUser } from '../services/doctorService.js';
import { nextId } from '../utils/idGen.js';
import { Errors } from '../utils/ApiError.js';
import { allUrgencyGuidance, guidanceFor } from '../services/urgencyGuidance.js';
import { aiDiagnose } from '../services/aiClient.js';

export async function handleDoctorDashboard(req: Request, res: Response) {
  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  const today = new Date().toISOString().split('T')[0];

  const appointments = await Appointment.find({
    doctor_id: doctor.doctor_id,
    date: { $gte: today },
    status: { $in: ['scheduled', 'confirmed', 'in_queue', 'in_consultation'] },
  })
    .sort({ date: 1, time: 1 })
    .limit(50)
    .lean();

  const patientIds = appointments.map((a) => a.patient_id);
  const patients = await Patient.find({ patient_id: { $in: patientIds } }).lean();
  const patientMap = new Map(patients.map((p) => [p.patient_id, p]));

  const queueEntries = await Queue.find({
    doctor_id: doctor.doctor_id,
    status: { $in: ['waiting', 'called', 'in_consultation'] },
  })
    .sort({ priority_score: -1, created_at: 1 })
    .lean();

  const urgencyBreakdown = { red: 0, orange: 0, yellow: 0, green: 0 };
  for (const q of queueEntries) {
    const key = q.urgency as keyof typeof urgencyBreakdown;
    if (urgencyBreakdown[key] !== undefined) urgencyBreakdown[key]++;
  }

  const preconsults = await PreConsultation.find({
    appointment_id: { $in: appointments.map((a) => a.appointment_id) },
  }).lean();
  const preconsultMap = new Map(preconsults.map((row) => [row.appointment_id, row]));

  const appointmentViews = appointments.map((a) => {
    const p = patientMap.get(a.patient_id);
    const queue = queueEntries.find((q) => q.appointment_id === a.appointment_id);
    const preconsult = preconsultMap.get(a.appointment_id);
    return {
      appointment_id: a.appointment_id,
      patient_id: a.patient_id,
      patient_name: p?.name ?? 'Unknown',
      date: a.date,
      time: a.time,
      urgency: a.urgency,
      status: a.status,
      queue_position: queue?.queue_token ?? null,
      queue_status: queue?.status ?? null,
      preconsult_status: preconsult?.status ?? null,
      chief_complaint: preconsult?.chief_complaint || a.reason || '',
      urgency_guidance: guidanceFor(a.urgency),
    };
  });

  res.json({
    success: true,
    data: {
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.name,
      specialization: doctor.specialization,
      today_appointments: appointmentViews,
      total_today: appointments.length,
      queue_length: queueEntries.length,
      urgency_breakdown: urgencyBreakdown,
      urgency_guidance: allUrgencyGuidance(),
    },
  });
}

export async function handlePatientSummary(req: Request, res: Response) {
  const { patientId } = req.params;
  if (!patientId) throw Errors.badRequest('patientId is required');

  const patient = await Patient.findOne({ patient_id: patientId }).lean();
  if (!patient) throw Errors.notFound('Patient not found');

  const preConsult = await PreConsultation.findOne({
    patient_id: patientId,
    status: 'completed',
  })
    .sort({ created_at: -1 })
    .lean();

  const conversation = await Conversation.findOne({
    patient_id: patientId,
    status: 'completed',
  })
    .sort({ updated_at: -1 })
    .lean();

  const reports = await MedicalReport.find({ patient_id: patientId })
    .sort({ created_at: -1 })
    .limit(5)
    .lean();

  const pastAppointments = await Appointment.find({ patient_id: patientId })
    .sort({ date: -1, time: -1 })
    .limit(5)
    .lean();

  res.json({
    success: true,
    data: {
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        blood_group: patient.blood_group,
        existing_conditions: patient.existing_conditions,
        allergies: patient.allergies,
        medical_history: patient.medical_history,
        emergency_contact: patient.emergency_contact,
      },
      preconsult_summary: preConsult
        ? {
            chief_complaint: preConsult.chief_complaint,
            symptoms: preConsult.symptoms,
            medications: preConsult.medications,
            allergies: preConsult.allergies,
            medical_history: preConsult.medical_history,
            lifestyle_notes: preConsult.lifestyle_notes,
            vital_signs: preConsult.vital_signs,
            triage_context: preConsult.triage_context,
            clinical_summary: preConsult.clinical_summary,
            urgency: preConsult.urgency,
          }
        : null,
      triage_result: conversation?.triage_result ?? null,
      urgency: preConsult?.urgency || conversation?.urgency || '',
      recent_reports: reports.map((r) => ({
        report_id: r.report_id,
        diagnosis: r.doctor_diagnosis,
        date: r.created_at,
      })),
      recent_appointments: pastAppointments.map((a) => ({
        appointment_id: a.appointment_id,
        date: a.date,
        time: a.time,
        reason: a.reason,
        status: a.status,
      })),
    },
  });
}

export async function handlePatientHistory(req: Request, res: Response) {
  const doctor = await getDoctorForUser(req.user!.user_id);
  const appointments = await Appointment.find({ doctor_id: doctor.doctor_id })
    .sort({ date: -1, time: -1 })
    .lean();
  const patientIds = [...new Set(appointments.map((appointment) => appointment.patient_id))];
  const patients = await Patient.find({ patient_id: { $in: patientIds } }).lean();
  const patientMap = new Map(patients.map((patient) => [patient.patient_id, patient]));
  const history = patientIds.map((patientId) => {
    const patientAppointments = appointments.filter((appointment) => appointment.patient_id === patientId);
    const latest = patientAppointments[0];
    const patient = patientMap.get(patientId);
    return {
      patient_id: patientId,
      name: patient?.name ?? 'Unknown',
      age: patient?.age,
      gender: patient?.gender,
      last_visit: latest?.date,
      last_time: latest?.time,
      visit_count: patientAppointments.length,
      last_status: latest?.status,
    };
  });
  res.json({ success: true, data: history });
}

export async function handleConsultation(req: Request, res: Response) {
  const { appointmentId } = req.params;
  if (!appointmentId) throw Errors.badRequest('appointmentId is required');

  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  const appointment = await Appointment.findOne({ appointment_id: appointmentId }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');
  if (appointment.doctor_id !== doctor.doctor_id) throw Errors.forbidden();

  const patient = await Patient.findOne({ patient_id: appointment.patient_id }).lean();
  if (!patient) throw Errors.notFound('Patient not found');

  const preConsult = await PreConsultation.findOne({ appointment_id: appointmentId }).lean();
  const conversation = await Conversation.findOne({
    patient_id: appointment.patient_id,
    status: 'completed',
  })
    .sort({ updated_at: -1 })
    .lean();
  const queue = await Queue.findOne({ appointment_id: appointmentId }).sort({ created_at: -1 }).lean();
  const notes = await DoctorNote.find({
    $or: [
      { appointment_id: appointmentId },
      ...(queue?.queue_id ? [{ queue_id: queue.queue_id }] : []),
    ],
  })
    .sort({ created_at: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      appointment: {
        appointment_id: appointment.appointment_id,
        date: appointment.date,
        time: appointment.time,
        reason: appointment.reason,
        status: appointment.status,
        urgency: appointment.urgency,
      },
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        blood_group: patient.blood_group,
        existing_conditions: patient.existing_conditions,
        allergies: patient.allergies,
        medical_history: patient.medical_history,
      },
      preconsult_summary: preConsult
        ? {
            chief_complaint: preConsult.chief_complaint,
            symptoms: preConsult.symptoms,
            medications: preConsult.medications,
            allergies: preConsult.allergies,
            medical_history: preConsult.medical_history,
            lifestyle_notes: preConsult.lifestyle_notes,
            vital_signs: preConsult.vital_signs,
            clinical_summary: preConsult.clinical_summary,
            urgency: preConsult.urgency,
            status: preConsult.status,
          }
        : null,
      triage_result: conversation?.triage_result ?? null,
      urgency: preConsult?.urgency || appointment.urgency || conversation?.urgency || '',
      urgency_guidance: guidanceFor(preConsult?.urgency || appointment.urgency || conversation?.urgency || ''),
      ai_assist: appointment.ai_assist ?? null,
      queue: queue
        ? {
            queue_id: queue.queue_id,
            queue_token: queue.queue_token,
            status: queue.status,
            position: null,
          }
        : null,
      notes,
    },
  });
}

export async function handleDiagnoseConsultation(req: Request, res: Response) {
  const { appointmentId } = req.params;
  if (!appointmentId) throw Errors.badRequest('appointmentId is required');

  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  const appointment = await Appointment.findOne({ appointment_id: appointmentId }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');
  if (appointment.doctor_id !== doctor.doctor_id) throw Errors.forbidden();

  const patient = await Patient.findOne({ patient_id: appointment.patient_id }).lean();
  if (!patient) throw Errors.notFound('Patient not found');
  const preConsult = await PreConsultation.findOne({ appointment_id: appointmentId }).lean();
  const notes = await DoctorNote.find({ appointment_id: appointmentId }).sort({ created_at: -1 }).limit(8).lean();

  const assist = await aiDiagnose({
    patient: {
      age: patient.age,
      gender: patient.gender,
      allergies: patient.allergies,
      existing_conditions: patient.existing_conditions,
      medical_history: patient.medical_history,
    },
    preconsult_summary: preConsult
      ? {
          chief_complaint: preConsult.chief_complaint,
          symptoms: preConsult.symptoms,
          medications: preConsult.medications,
          allergies: preConsult.allergies,
          medical_history: preConsult.medical_history,
          lifestyle_notes: preConsult.lifestyle_notes,
          vital_signs: preConsult.vital_signs,
          clinical_summary: preConsult.clinical_summary,
          urgency: preConsult.urgency,
        }
      : {},
    notes: notes.map((note) => ({ content: note.content, created_at: note.created_at })),
    reason: appointment.reason,
    urgency: preConsult?.urgency || appointment.urgency,
  });

  await Appointment.updateOne({ appointment_id: appointmentId }, { $set: { ai_assist: assist } });
  res.json({ success: true, data: assist });
}

export async function handleCreateNote(req: Request, res: Response) {
  const { queueId } = req.params;
  const { content, appointment_id } = req.body as { content: string; appointment_id?: string };
  if (!content) throw Errors.badRequest('content is required');

  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  let patientId = '';
  let appointmentId = appointment_id || '';
  let resolvedQueueId = queueId || '';

  if (queueId) {
    const queueEntry = await Queue.findOne({ queue_id: queueId }).lean();
    if (!queueEntry) throw Errors.notFound('Queue entry not found');
    if (queueEntry.doctor_id !== doctor.doctor_id) throw Errors.forbidden();
    patientId = queueEntry.patient_id;
    appointmentId = appointmentId || queueEntry.appointment_id;
    resolvedQueueId = queueEntry.queue_id;
  } else if (appointmentId) {
    const appointment = await Appointment.findOne({ appointment_id: appointmentId }).lean();
    if (!appointment) throw Errors.notFound('Appointment not found');
    if (appointment.doctor_id !== doctor.doctor_id) throw Errors.forbidden();
    patientId = appointment.patient_id;
    const queueEntry = await Queue.findOne({ appointment_id: appointmentId }).lean();
    resolvedQueueId = queueEntry?.queue_id || '';
  } else {
    throw Errors.badRequest('appointment_id or queue id is required');
  }

  const noteId = await nextId('DN', 3);
  const note = await DoctorNote.create({
    note_id: noteId,
    doctor_id: doctor.doctor_id,
    queue_id: resolvedQueueId,
    appointment_id: appointmentId,
    patient_id: patientId,
    content,
  });

  res.status(201).json({ success: true, data: note });
}

export async function handleGetNotes(req: Request, res: Response) {
  const { queueId } = req.params;
  const appointmentId = typeof req.query.appointment_id === 'string' ? req.query.appointment_id : '';

  const filter = queueId
    ? { queue_id: queueId }
    : appointmentId
      ? { appointment_id: appointmentId }
      : null;
  if (!filter) throw Errors.badRequest('queue id or appointment_id is required');

  const notes = await DoctorNote.find(filter)
    .sort({ created_at: -1 })
    .lean();

  res.json({ success: true, data: notes });
}

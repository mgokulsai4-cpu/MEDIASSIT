import { Request, Response } from 'express';
import { bookAppointment, getPatientAppointments, updateAppointmentStatus } from '../services/appointmentAgent.js';
import { getPatientForUser } from '../services/patientService.js';
import { Errors } from '../utils/ApiError.js';
import { notify } from '../services/notificationService.js';
import { User } from '../models/User.js';
import { formatDateLong } from '../utils/time.js';
import { joinQueue } from '../services/queueAgent.js';

export async function handleCreateAppointment(req: Request, res: Response) {
  const isPatient = req.user!.role === 'patient';
  const requesterPatient = req.user!.role === 'patient' ? await getPatientForUser(req.user!.user_id) : null;
  const patient_id =
    req.user!.role === 'doctor' || req.user!.role === 'admin'
      ? (req.body.patient_id as string)
      : requesterPatient?.patient_id;
  if (!patient_id) throw Errors.badRequest('patient_id is required');

  const result = await bookAppointment({
    patient_id,
    doctor_id: req.body.doctor_id as string,
    date: req.body.date as string,
    time: req.body.time as string,
    hospital: req.body.hospital as string | undefined,
    reason: req.body.reason as string | undefined,
    urgency: req.body.urgency as 'green' | 'yellow' | 'orange' | 'red' | undefined,
  });
  const queue = isPatient ? await joinQueue(result.appointment.appointment_id) : null;

  if (isPatient) {
    const user = await User.findOne({ user_id: req.user!.user_id }).lean();
    void notify.appointmentConfirmed(
      user?.user_id ?? req.user!.user_id,
      result.appointment.appointment_id,
      result.doctor.name,
      formatDateLong(result.appointment.date),
      result.appointment.time,
    );
  }
  res.status(201).json({ success: true, data: { ...result, queue } });
}

export async function handleListAppointments(req: Request, res: Response) {
  const patient_id = String(req.params.patientId) as string;
  if (req.user!.role === 'patient') {
    const own = await getPatientForUser(req.user!.user_id);
    if (!own || own.patient_id !== patient_id) throw Errors.forbidden();
  }
  const appointments = await getPatientAppointments(patient_id);
  res.json({ success: true, data: appointments });
}

export async function handleListMyAppointments(req: Request, res: Response) {
  const own = await getPatientForUser(req.user!.user_id);
  if (!own) throw Errors.notFound('Patient record not found');
  const appointments = await getPatientAppointments(own.patient_id);
  res.json({ success: true, data: appointments });
}

export async function handleUpdateAppointment(req: Request, res: Response) {
  const id = String(req.params.id);
  const { status } = req.body as { status?: string };
  if (req.user!.role === 'patient') {
    if (status !== 'cancelled') throw Errors.forbidden('Patients may only cancel their own appointments');
    const own = await getPatientForUser(req.user!.user_id);
    const appts = await getPatientAppointments(own?.patient_id ?? '');
    if (!appts.some((a) => a.appointment_id === id)) throw Errors.forbidden();
  }
  const appointment = await updateAppointmentStatus(id, status ?? '');
  if (status === 'cancelled') {
    const user = await User.findOne({ user_id: req.user!.user_id }).lean();
    void notify.appointmentCancelled(user?.user_id ?? req.user!.user_id, id);
  }
  res.json({ success: true, data: appointment });
}

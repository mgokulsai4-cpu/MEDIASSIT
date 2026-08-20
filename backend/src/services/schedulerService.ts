import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { notify } from './notificationService.js';
import { getDoctor } from './doctorService.js';
import { listDoctorQueue, AVG_CONSULT_MINUTES } from './queueAgent.js';
import { emitQueueUpdate } from './realtimeService.js';
import { logger } from '../utils/logger.js';

let intervalId: ReturnType<typeof setInterval> | null = null;
let queueTickId: ReturnType<typeof setInterval> | null = null;

export async function sendDueReminders(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const appointments = await Appointment.find({
    date: tomorrowStr,
    status: { $in: ['confirmed', 'scheduled', 'in_queue'] },
    reminder_sent_at: { $exists: false },
  }).lean();

  let sent = 0;
  for (const appt of appointments) {
    try {
      const doctor = await getDoctor(appt.doctor_id);
      const patient = await Patient.findOne({ patient_id: appt.patient_id }).lean();
      if (patient?.user_id) {
        await notify.appointmentReminder(
          patient.user_id,
          appt.appointment_id,
          doctor.name,
          appt.date,
          appt.time,
        );
        await Appointment.updateOne(
          { appointment_id: appt.appointment_id, reminder_sent_at: { $exists: false } },
          { $set: { reminder_sent_at: new Date() } },
        );
        sent += 1;
      }
    } catch (err) {
      logger.warn('Failed to send reminder for appointment ' + appt.appointment_id);
      void err;
    }
  }
  return sent;
}

async function broadcastQueueUpdates(): Promise<void> {
  const queues = await listActiveQueues();
  const doctorIds = [...new Set(queues.map((q) => q.doctor_id))];
  for (const doctorId of doctorIds) {
    const rows = await listDoctorQueue(doctorId);
    for (const row of rows) {
      emitQueueUpdate(row.queue_id, {
        queue_id: row.queue_id,
        position: row.position,
        waiting_time: row.waiting_time,
        eta_minutes: row.waiting_time ?? (row.position ? (row.position - 1) * AVG_CONSULT_MINUTES : 0),
        status: row.status,
      });
    }
  }
}

export function startScheduler(intervalMinutes = 30) {
  if (intervalId) return;

  queueTickId = setInterval(() => {
    void broadcastQueueUpdates().catch((err) => {
      logger.warn('Queue broadcast tick error: ' + (err as Error).message);
    });
  }, 30 * 1000);

  intervalId = setInterval(() => {
    void sendDueReminders().catch((err) => {
      logger.warn('Scheduler error: ' + (err as Error).message);
    });
  }, intervalMinutes * 60 * 1000);

  logger.info('Scheduler started (interval: ' + intervalMinutes + ' min)');
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (queueTickId) {
    clearInterval(queueTickId);
    queueTickId = null;
  }
}

async function listActiveQueues() {
  const { Queue } = await import('../models/Queue.js');
  return Queue.find({ status: { $in: ['waiting', 'called', 'in_consultation'] } }).lean();
}

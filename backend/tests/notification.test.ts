import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import {
  app,
  auth,
  isoDaysFromNow,
  seedDoctor,
  setupDb,
  teardownDb,
  tokenFrom,
} from './helpers.js';
import { sendDueReminders } from '../src/services/schedulerService.js';
import { Appointment } from '../src/models/Appointment.js';

before(async () => {
  await setupDb();
  await seedDoctor();
});
after(async () => {
  await teardownDb();
});

async function registerPatient(email: string) {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Notify ' + email, email, password: 'Secret@123' });
  return { token: tokenFrom(res.body), patient: res.body.data.patient, user: res.body.data.user };
}

test('booking stores an appointment confirmation in the inbox', async () => {
  const patient = await registerPatient('notify-book@test.com');
  const book = await request(app())
    .post('/api/appointments')
    .set(auth(patient.token))
    .send({ doctor_id: 'D001', date: isoDaysFromNow(1), time: '10:00 AM', reason: 'Checkup' });
  assert.strictEqual(book.status, 201);

  const inbox = await request(app()).get('/api/notifications').set(auth(patient.token));
  assert.strictEqual(inbox.status, 200);
  const types = inbox.body.data.map((row: { type: string }) => row.type);
  assert.ok(types.includes('appointment_confirmed') || types.includes('queue_update'));
});

test('doctor becoming available alerts patients with upcoming appointments', async () => {
  const patient = await registerPatient('notify-avail@test.com');
  const docReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr Available', email: 'avail-doc@test.com', password: 'Secret@123', role: 'doctor' });
  const doctorToken = tokenFrom(docReg.body);
  await seedDoctor({
    doctor_id: 'D020',
    user_id: docReg.body.data.user.user_id,
    name: 'Dr Available',
    specialization: 'General Physician',
    department: 'Primary Care',
    status: 'busy',
  });

  const book = await request(app())
    .post('/api/appointments')
    .set(auth(patient.token))
    .send({ doctor_id: 'D020', date: isoDaysFromNow(1), time: '10:30 AM', reason: 'Follow up' });
  assert.strictEqual(book.status, 201, JSON.stringify(book.body));

  const statusRes = await request(app())
    .patch('/api/doctors/me/status')
    .set(auth(doctorToken))
    .send({ status: 'available' });
  assert.strictEqual(statusRes.status, 200, JSON.stringify(statusRes.body));

  const inbox = await request(app()).get('/api/notifications').set(auth(patient.token));
  const types = inbox.body.data.map((row: { type: string }) => row.type);
  assert.ok(types.includes('doctor_availability'));
});

test('appointment reminders are sent only once', async () => {
  const patient = await registerPatient('notify-remind@test.com');
  const book = await request(app())
    .post('/api/appointments')
    .set(auth(patient.token))
    .send({ doctor_id: 'D001', date: isoDaysFromNow(1), time: '11:00 AM', reason: 'Reminder case' });
  assert.strictEqual(book.status, 201);
  const appointmentId = book.body.data.appointment.appointment_id;
  await Appointment.updateOne({ appointment_id: appointmentId }, { $unset: { reminder_sent_at: 1 } });

  const first = await sendDueReminders();
  const second = await sendDueReminders();
  assert.ok(first >= 1);
  assert.strictEqual(second, 0);
});

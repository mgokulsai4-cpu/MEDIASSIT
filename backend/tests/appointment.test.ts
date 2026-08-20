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

before(async () => {
  await setupDb();
  await seedDoctor();
});
after(async () => {
  await teardownDb();
});

async function patientToken(email = 'appt@test.com') {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Appt ' + email, email, password: 'Secret@123' });
  return tokenFrom(res.body);
}

test('GET /api/doctors returns the seeded doctors', async () => {
  const res = await request(app()).get('/api/doctors').set(auth(await patientToken('appt-list@test.com')));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.length >= 1);
});

test('GET /api/doctors/D001/availability returns future slots', async () => {
  const res = await request(app())
    .get('/api/doctors/D001/availability?date=' + isoDaysFromNow(1))
    .set(auth(await patientToken('appt-avail@test.com')));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.slots.includes('10:30 AM'));
});

test('POST /api/appointments books and lists an appointment', async () => {
  const token = await patientToken();
  const date = isoDaysFromNow(1);

  const book = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date, time: '10:30 AM', reason: 'Knee pain', urgency: 'orange' });
  assert.strictEqual(book.status, 201);
  const apt = book.body.data.appointment;
  assert.ok(apt.appointment_id.startsWith('A'));
  assert.strictEqual(apt.status, 'scheduled');

  const list = await request(app())
    .get('/api/appointments/patient/' + apt.patient_id)
    .set(auth(token));
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.data.some((a: any) => a.appointment_id === apt.appointment_id));
});

test('double-booking the same slot is rejected', async () => {
  const token = await patientToken('appt-double@test.com');
  const date = isoDaysFromNow(1);
  await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date, time: '09:00 AM', reason: 'First' });
  const second = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date, time: '09:00 AM', reason: 'Second' });
  assert.strictEqual(second.status, 409);
});

test('booking inherits the latest triage urgency when none is sent', async () => {
  const token = await patientToken('appt-urgency@test.com');
  const me = await request(app()).get('/api/patients/me').set(auth(token));
  const patientId = me.body.data.patient.patient_id;
  const { Conversation } = await import('../src/models/Conversation.js');
  await Conversation.create({
    conversation_id: 'C-URGENCY-1',
    patient_id: patientId,
    status: 'completed',
    urgency: 'orange',
    updated_at: new Date(),
  });
  const book = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date: isoDaysFromNow(3), time: '11:00 AM', reason: 'Follow-up from triage' });
  assert.strictEqual(book.status, 201, JSON.stringify(book.body));
  assert.strictEqual(book.body.data.appointment.urgency, 'orange');
});

test('patients can cancel their own appointment', async () => {
  const token = await patientToken('appt-cancel@test.com');
  const patientId = (await request(app()).get('/api/auth/me').set(auth(token))).body.data.user.user_id;
  const user = await (await import('../src/models/User.js')).User.findOne({ user_id: patientId }).lean();
  const patient = await (await import('../src/models/Patient.js')).Patient.findOne({ user_id: user!.user_id }).lean();
  const date = isoDaysFromNow(2);
  const book = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date, time: '09:30 AM', reason: 'Cancel me' });
  const id = book.body.data.appointment.appointment_id;
  const cancel = await request(app())
    .patch('/api/appointments/' + id)
    .set(auth(token))
    .send({ status: 'cancelled' });
  assert.strictEqual(cancel.status, 200);
  assert.strictEqual(cancel.body.data.status, 'cancelled');
  void patient;
});
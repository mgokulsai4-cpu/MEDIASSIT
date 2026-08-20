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

async function patientToken(email: string) {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Q ' + email, email, password: 'Secret@123' });
  return { token: tokenFrom(res.body), patient: res.body.data.patient };
}

async function book(token: string, patientId: string, urgency: string, reason: string, time = '09:00 AM') {
  const res = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date: isoDaysFromNow(1), time, reason, urgency });
  if (res.status !== 201) throw new Error('Booking failed (' + res.status + '): ' + JSON.stringify(res.body));
  return res.body.data.appointment;
}

test('queue join creates a token and honors urgency in ordering', async () => {
  const a = await patientToken('qa@test.com');
  const b = await patientToken('qb@test.com');
  const c = await patientToken('qc@test.com');

  const aptRoutine = await book(a.token, a.patient.patient_id, 'green', 'Routine check', '09:00 AM');
  const aptUrgent = await book(b.token, b.patient.patient_id, 'orange', 'Bad pain', '09:30 AM');
  const aptEmerg = await book(c.token, c.patient.patient_id, 'red', 'Danger', '10:00 AM');

  await request(app()).post('/api/queue/join').set(auth(a.token)).send({ appointment_id: aptRoutine.appointment_id });
  const q2 = await request(app()).post('/api/queue/join').set(auth(b.token)).send({ appointment_id: aptUrgent.appointment_id });
  const q3 = await request(app()).post('/api/queue/join').set(auth(c.token)).send({ appointment_id: aptEmerg.appointment_id });

  assert.ok(q2.body.data.queue_token.startsWith('Q'));

  const doctorQueue = await request(app()).get('/api/queue/doctor/D001').set(auth(a.token));
  const rows = doctorQueue.body.data;
  assert.ok(rows.length === 3);
  // Emergency must be first (highest priority), routine last.
  assert.strictEqual(rows[0].urgency, 'red');
  assert.strictEqual(rows[2].urgency, 'green');
});

test('manual override with reason is recorded and changes order', async () => {
  const a = await patientToken('qd@test.com');
  const regDoc = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr Sam', email: 'sam@test.com', password: 'Secret@123', role: 'doctor' });
  const doctorToken = tokenFrom(regDoc.body);
  await seedDoctor({ doctor_id: 'D002', user_id: regDoc.body.data.user.user_id, name: 'Dr Sam', specialization: 'Cardiologist', department: 'Cardiology', availability: undefined });

  const apt = await book(a.token, a.patient.patient_id, 'green', 'Routine', '10:30 AM');
  await request(app()).post('/api/queue/join').set(auth(a.token)).send({ appointment_id: apt.appointment_id });

  const queueRow = await request(app()).get('/api/queue/patient/' + a.patient.patient_id).set(auth(a.token));
  const queueId = queueRow.body.data.queue_id;

  const forcible = await request(app())
    .patch('/api/queue/' + queueId + '/override')
    .set(auth(doctorToken))
    .send({ priority_score: 5000, reason: 'Doctor override: patient walk-in critical' });
  assert.strictEqual(forcible.status, 200);
  const updated = forcible.body.data;
  assert.ok(updated.override_priority === 5000);
  assert.ok(updated.override_reason.includes('walk-in'));

  const denied = await request(app())
    .patch('/api/queue/' + queueId + '/override')
    .set(auth(a.token))
    .send({ priority_score: 1, reason: 'not allowed' });
  assert.strictEqual(denied.status, 403);
});

test('queue status transitions update appointment status', async () => {
  const a = await patientToken('qe@test.com');
  const regDoc = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr Ann', email: 'ann@test.com', password: 'Secret@123', role: 'doctor' });
  const doctorToken = tokenFrom(regDoc.body);
  const apt = await book(a.token, a.patient.patient_id, 'yellow', 'Follow-up', '11:00 AM');
  await request(app()).post('/api/queue/join').set(auth(a.token)).send({ appointment_id: apt.appointment_id });
  const queueRow = await request(app()).get('/api/queue/patient/' + a.patient.patient_id).set(auth(a.token));

  const called = await request(app())
    .patch('/api/queue/' + queueRow.body.data.queue_id)
    .set(auth(doctorToken))
    .send({ status: 'called' });
  assert.strictEqual(called.status, 200);
  assert.strictEqual(called.body.data.status, 'called');

  const completed = await request(app())
    .patch('/api/queue/' + queueRow.body.data.queue_id)
    .set(auth(doctorToken))
    .send({ status: 'completed' });
  assert.strictEqual(completed.status, 200);
  const patientAppts = await request(app())
    .get('/api/appointments/patient/' + a.patient.patient_id)
    .set(auth(a.token));
  const updated = patientAppts.body.data.find((x: any) => x.appointment_id === apt.appointment_id);
  assert.strictEqual(updated.status, 'completed');
});
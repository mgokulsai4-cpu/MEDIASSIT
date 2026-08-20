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
    .send({ name: 'PC ' + email, email, password: 'Secret@123' });
  return { token: tokenFrom(res.body), patient: res.body.data.patient };
}

async function book(token: string, time = '10:00 AM') {
  const res = await request(app())
    .post('/api/appointments')
    .set(auth(token))
    .send({ doctor_id: 'D001', date: isoDaysFromNow(1), time, reason: 'Fever and cough' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.data.appointment;
}

async function driveInterview(token: string, appointmentId: string) {
  const start = await request(app())
    .post('/api/preconsult/start')
    .set(auth(token))
    .send({ appointment_id: appointmentId });
  assert.strictEqual(start.status, 200, JSON.stringify(start.body));
  let turn = start.body.data;
  assert.ok(turn.pc_id);

  let guard = 0;
  while (turn.type !== 'result' && guard < 25) {
    const question = turn.question;
    assert.ok(question, 'expected a question turn: ' + JSON.stringify(turn));
    const option = (question.options || []).find((row: { id: string }) => row.id !== 'free_text') || question.options?.[0];
    const answer = !option || option.id === 'free_text' ? 'Fever and cough for two days' : option.id;
    const res = await request(app())
      .post('/api/preconsult/answer')
      .set(auth(token))
      .send({
        pc_id: turn.pc_id,
        message: answer,
        answers: [{ key: question.key || question.id, answer }],
      });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    turn = res.body.data;
    guard += 1;
  }
  assert.strictEqual(turn.type, 'result');
  return turn;
}

test('preconsult start is scoped to the patient appointment and persists the session', async () => {
  const a = await patientToken('pc-start@test.com');
  const apt = await book(a.token, '09:00 AM');
  const start = await request(app())
    .post('/api/preconsult/start')
    .set(auth(a.token))
    .send({ appointment_id: apt.appointment_id });
  assert.strictEqual(start.status, 200);
  assert.ok(start.body.data.pc_id);
  assert.ok(start.body.data.type === 'question' || start.body.data.type === 'result');

  const other = await patientToken('pc-other@test.com');
  const forbidden = await request(app())
    .post('/api/preconsult/start')
    .set(auth(other.token))
    .send({ appointment_id: apt.appointment_id });
  assert.strictEqual(forbidden.status, 404);
});

test('preconsult completion stores a structured summary for the doctor', async () => {
  const a = await patientToken('pc-done@test.com');
  const apt = await book(a.token, '09:30 AM');
  const result = await driveInterview(a.token, apt.appointment_id);
  assert.ok(result.preconsult_summary);
  assert.ok(result.preconsult_summary.chief_complaint);
  assert.ok(result.preconsult_summary.clinical_summary);

  const again = await request(app())
    .post('/api/preconsult/start')
    .set(auth(a.token))
    .send({ appointment_id: apt.appointment_id });
  assert.strictEqual(again.body.data.type, 'result');
  assert.strictEqual(again.body.data.status, 'completed');
});

test('doctor consultation payload includes the preconsult summary and accepts notes', async () => {
  const a = await patientToken('pc-doc@test.com');
  const apt = await book(a.token, '10:30 AM');
  await driveInterview(a.token, apt.appointment_id);

  const docReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr Consult', email: 'consult-doc@test.com', password: 'Secret@123', role: 'doctor' });
  const doctorToken = tokenFrom(docReg.body);
  await seedDoctor({
    doctor_id: 'D030',
    user_id: docReg.body.data.user.user_id,
    name: 'Dr Consult',
    specialization: 'General Physician',
    department: 'Primary Care',
  });
  const assigned = await request(app())
    .post('/api/appointments')
    .set(auth(a.token))
    .send({ doctor_id: 'D030', date: isoDaysFromNow(2), time: '09:00 AM', reason: 'Second visit' });
  assert.strictEqual(assigned.status, 201, JSON.stringify(assigned.body));
  const appointmentId = assigned.body.data.appointment.appointment_id;
  await driveInterview(a.token, appointmentId);

  const consult = await request(app())
    .get('/api/doctor-dashboard/consultation/' + appointmentId)
    .set(auth(doctorToken));
  assert.strictEqual(consult.status, 200, JSON.stringify(consult.body));
  assert.ok(consult.body.data.patient.name);
  assert.ok(consult.body.data.preconsult_summary);

  const note = await request(app())
    .post('/api/doctor-dashboard/notes')
    .set(auth(doctorToken))
    .send({ appointment_id: appointmentId, content: 'Continue fluids and review tomorrow.' });
  assert.strictEqual(note.status, 201, JSON.stringify(note.body));
  assert.strictEqual(note.body.data.content.includes('fluids'), true);
});

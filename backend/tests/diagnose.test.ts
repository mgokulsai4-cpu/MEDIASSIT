import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { Doctor } from '../src/models/Doctor.js';
import { ALL_DAYS, app, auth, isoDaysFromNow, setupDb, teardownDb, tokenFrom } from './helpers.js';

before(async () => {
  await setupDb();
});
after(async () => {
  await teardownDb();
});

test('doctor can request AI diagnostic assistance for a consultation', async () => {
  const patientReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dx Patient', email: 'dx-patient@test.com', password: 'Secret@123' });
  const doctorReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr Dx', email: 'dx-doc@test.com', password: 'Secret@123', role: 'doctor' });
  await Doctor.create({
    doctor_id: 'D-DX',
    user_id: doctorReg.body.data.user.user_id,
    name: 'Dr Dx',
    specialization: 'General Physician',
    department: 'Primary Care',
    experience: 10,
    rating: 4.6,
    availability: ALL_DAYS.map((day) => ({ day, slots: ['09:00'] })),
    status: 'available',
  });

  const book = await request(app())
    .post('/api/appointments')
    .set(auth(tokenFrom(patientReg.body)))
    .send({ doctor_id: 'D-DX', date: isoDaysFromNow(1), time: '09:00 AM', reason: 'Fever and cough' });
  assert.strictEqual(book.status, 201, JSON.stringify(book.body));
  const appointmentId = book.body.data.appointment.appointment_id;

  const denied = await request(app())
    .post(`/api/doctor-dashboard/consultation/${appointmentId}/diagnose`)
    .set(auth(tokenFrom(patientReg.body)));
  assert.strictEqual(denied.status, 403);

  const assist = await request(app())
    .post(`/api/doctor-dashboard/consultation/${appointmentId}/diagnose`)
    .set(auth(tokenFrom(doctorReg.body)));
  assert.strictEqual(assist.status, 200, JSON.stringify(assist.body));
  assert.ok(assist.body.data.diagnoses);
  assert.ok(assist.body.data.disclaimer);

  const consultation = await request(app())
    .get(`/api/doctor-dashboard/consultation/${appointmentId}`)
    .set(auth(tokenFrom(doctorReg.body)));
  assert.strictEqual(consultation.status, 200);
  assert.ok(consultation.body.data.ai_assist);
  assert.ok(consultation.body.data.urgency_guidance);
});

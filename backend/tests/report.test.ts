import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { Doctor } from '../src/models/Doctor.js';
import {
  app,
  auth,
  isoDaysFromNow,
  setupDb,
  teardownDb,
  tokenFrom,
} from './helpers.js';

before(async () => {
  await setupDb();
});
after(async () => {
  await teardownDb();
});

async function seedStaff() {
  const patientReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Report Patient', email: 'rp@test.com', password: 'Secret@123' });
  const doctorReg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dr.Reena', email: 'reena@test.com', password: 'Secret@123', role: 'doctor' });
  const doctorUserId = doctorReg.body.data.user.user_id;
  await Doctor.create({
    doctor_id: 'D003',
    user_id: doctorUserId,
    name: 'Dr.Reena',
    specialization: 'Orthopedic Specialist',
    department: 'Orthopedics',
    qualification: 'MBBS, MS',
    experience: 8,
    consultation_fee: 600,
    room_number: '301',
    rating: 4.5,
    availability: [{ day: 'Monday', slots: ['09:00'] }],
    status: 'available',
  });
  return {
    patientToken: tokenFrom(patientReg.body),
    doctorToken: tokenFrom(doctorReg.body),
    patient: patientReg.body.data.patient,
  };
}

test('doctor creates a report, patient reads it, and the summarizer runs', async () => {
  const { patientToken, doctorToken, patient } = await seedStaff();
  const date = isoDaysFromNow(1);

  const book = await request(app())
    .post('/api/appointments')
    .set(auth(patientToken))
    .send({ doctor_id: 'D003', date, time: '09:00 AM', reason: 'Knee pain after fall', urgency: 'orange' });
  assert.strictEqual(book.status, 201);
  const appointmentId = book.body.data.appointment.appointment_id;

  // A patient cannot create a report
  const denied = await request(app())
    .post('/api/reports')
    .set(auth(patientToken))
    .send({ patient_id: patient.patient_id, appointment_id: appointmentId, doctor_diagnosis: 'x' });
  assert.strictEqual(denied.status, 403);

  const created = await request(app())
    .post('/api/reports')
    .set(auth(doctorToken))
    .send({
      patient_id: patient.patient_id,
      appointment_id: appointmentId,
      symptoms: ['Knee pain', 'Swelling'],
      clinical_observations: 'Tenderness and mild swelling over the right knee.',
      doctor_diagnosis: 'Right knee sprain (Grade 1)',
      treatment: 'Rest, ice pack, compression bandage.',
      prescription: 'Paracetamol 500mg as needed',
      follow_up: 'Review in 1 week or earlier if pain increases.',
    });
  assert.strictEqual(created.status, 201);
  const reportId = created.body.data.report_id;
  assert.ok(reportId.startsWith('R'));

  const list = await request(app())
    .get('/api/reports/patient/' + patient.patient_id)
    .set(auth(patientToken));
  assert.ok(list.body.data.some((r: any) => r.report_id === reportId));

  const summary = await request(app())
    .post('/api/reports/' + reportId + '/summarize')
    .set(auth(patientToken));
  assert.strictEqual(summary.status, 200);
  const data = summary.body.data;
  assert.ok(data.ai_summary && typeof data.ai_summary === 'object');
  assert.ok(data.model_used.length > 0);
  assert.ok(String(data.ai_summary.diagnosis).includes('sprain'));

  const detailed = await request(app()).get('/api/reports/' + reportId).set(auth(patientToken));
  assert.strictEqual(detailed.status, 200);
  assert.ok(detailed.body.data.patient.patient_id === patient.patient_id);
});
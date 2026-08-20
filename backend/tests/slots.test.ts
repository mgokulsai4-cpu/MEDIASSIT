import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import {
  app,
  auth,
  seedDoctor,
  setupDb,
  teardownDb,
  tokenFrom,
} from './helpers.js';

before(async () => {
  await setupDb();
  await seedDoctor();
  await seedDoctor({
    doctor_id: 'D009',
    name: 'Dr. Quiet Clinic',
    specialization: 'General Physician',
    department: 'Primary Care',
  });
});
after(async () => {
  await teardownDb();
});

test('POST /api/slots/recommend returns ranked available slots', async () => {
  const reg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Slot Patient', email: 'slots@test.com', password: 'Secret@123' });
  const token = tokenFrom(reg.body);
  const res = await request(app())
    .post('/api/slots/recommend')
    .set(auth(token))
    .send({ urgency: 'orange' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.data.recommendations));
  assert.ok(res.body.data.recommendations.length > 0);
  const first = res.body.data.recommendations[0];
  assert.ok(first.doctor_id);
  assert.ok(first.date);
  assert.ok(first.time);
});

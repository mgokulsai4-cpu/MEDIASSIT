import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app, auth, setupDb, teardownDb, tokenFrom } from './helpers.js';

before(async () => {
  await setupDb();
});
after(async () => {
  await teardownDb();
});

test('POST /api/auth/register creates a patient and returns a token', async () => {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Patient One', email: 'one@test.com', phone: '9000000001', password: 'Secret@123', age: 30, gender: 'female' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.data.token);
  assert.strictEqual(res.body.data.user.role, 'patient');
  assert.ok(res.body.data.patient.patient_id.startsWith('P'));
  assert.ok(!res.body.data.user.password_hash);
});

test('POST /api/auth/register rejects duplicates', async () => {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Dup', email: 'one@test.com', password: 'Secret@123' });
  assert.strictEqual(res.status, 409);
});

test('POST /api/auth/login by email and by phone both work', async () => {
  const byEmail = await request(app())
    .post('/api/auth/login')
    .send({ identifier: 'one@test.com', password: 'Secret@123' });
  assert.strictEqual(byEmail.status, 200);
  assert.ok(byEmail.body.data.token);

  const byPhone = await request(app())
    .post('/api/auth/login')
    .send({ identifier: '9000000001', password: 'Secret@123' });
  assert.strictEqual(byPhone.status, 200);
});

test('POST /api/auth/login rejects wrong password and exposes route protection', async () => {
  const bad = await request(app())
    .post('/api/auth/login')
    .send({ identifier: 'one@test.com', password: 'wrong-password' });
  assert.strictEqual(bad.status, 401);

  const protectedRoute = await request(app()).get('/api/doctors');
  assert.strictEqual(protectedRoute.status, 401);
});

test('GET /api/auth/me returns the authenticated user', async () => {
  const reg = await request(app())
    .post('/api/auth/register')
    .send({ name: 'Me User', email: 'me@test.com', password: 'Secret@123' });
  const token = tokenFrom(reg.body);
  const res = await request(app()).get('/api/auth/me').set(auth(token));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.email, 'me@test.com');
});
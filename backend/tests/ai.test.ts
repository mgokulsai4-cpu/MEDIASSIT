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

async function patientToken(email = 'ai@test.com') {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'AI ' + email, email, password: 'Secret@123' });
  return tokenFrom(res.body);
}

test('POST /api/ai/chat asks a category question first for unknown text', async () => {
  const res = await request(app())
    .post('/api/ai/chat')
    .set(auth(await patientToken()))
    .send({ message: 'Something feels off but I cannot explain' });
  assert.strictEqual(res.status, 200);
  const data = res.body.data;
  assert.strictEqual(data.type, 'question');
  assert.strictEqual(data.question.id, 'category');
  assert.ok(data.conversation_id);
});

test('POST /api/ai/chat targets a specialty after adaptive question flow', async () => {
  const token = await patientToken('ai-knee@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let conversation_id: string | undefined;
  let turn: any;

  // 1. Patient describes knee problem
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'My knee hurts after I fell and now I cannot walk properly' });
  conversation_id = r.body.data.conversation_id;
  turn = r.body.data;
  assert.ok(turn.type === 'question');

  // 2. Answer severity = very bad
  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ conversation_id, answers: [{ key: 'Q_bone_sev', answer: 'severe' }] });
  turn = r.body.data;
  if (turn.type === 'question') {
    // 3. Answer fall/injury question
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id, answers: [{ key: 'Q_bone_cause', answer: 'fall' }] });
    turn = r.body.data;
  }

  while (turn.type === 'question') {
    const q = turn.question;
    const opt = q.options[0];
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id, answers: [{ key: q.id, answer: opt.id }] });
    turn = r.body.data;
  }

  assert.strictEqual(turn.type, 'result');
  const triage = turn.triage;
  assert.ok(triage.recommended_specialties.length >= 1);
  assert.strictEqual(triage.recommended_specialties[0].code, 'D003');
  assert.ok(triage.disclaimer.includes('not a medical diagnosis'));
});

test('POST /api/ai/chat flags an emergency for chest pain with sweating', async () => {
  const token = await patientToken('ai-chest@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'I have chest pain and I am sweating heavily' });
  let turn = r.body.data;
  if (turn.type === 'question') {
    const q = turn.question;
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id: r.body.data.conversation_id, answers: [{ key: q.id, answer: 'not_sure' }, { key: 'Q_chest_assoc', answer: 'sweating' }] });
    turn = r.body.data;
  }
  if (turn.type === 'question') {
    const q = turn.question;
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id: r.body.data.conversation_id, answers: [{ key: q.id, answer: 'severe' }] });
    turn = r.body.data;
  }
  assert.strictEqual(turn.type, 'result');
  assert.strictEqual(turn.triage.urgency.level, 'red');
  assert.strictEqual(turn.triage.emergency_flag, true);
  assert.ok(turn.triage.reason.includes('emergency'));
});

test('POST /api/ai/chat category not_sure asks an easy follow-up instead of ending', async () => {
  const token = await patientToken('ai-notsure@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'I do not feel well but cannot explain' });
  let turn = r.body.data;
  assert.strictEqual(turn.type, 'question');

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ conversation_id: turn.conversation_id, answers: [{ key: 'category', answer: 'not_sure' }] });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'category_fallback');
  assert.ok(turn.question.options.some((o: { id: string }) => o.id === 'dk'));

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ conversation_id: turn.conversation_id, answers: [{ key: 'category_fallback', answer: 'stomach_pain' }] });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_stomach_loc');
});

test('POST /api/ai/chat simple mode uses plain wording and tolerant answer keys', async () => {
  const token = await patientToken('ai-simple@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ simple: true, message: 'sir dard hai' });
  let turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_head_sev');
  assert.strictEqual(turn.question.rephrased, false);
  assert.strictEqual(turn.question.text, 'How bad is it? A little, medium or very bad?');
  assert.ok(turn.question.options.some((o: { id: string; text: string }) => o.id === 'not_sure' && o.text === 'I don\'t know'));

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ simple: true, conversation_id: turn.conversation_id, answers: [{ key: 'Q_head_sev.little', answer: 'little' }] });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_head_assoc');

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ simple: true, conversation_id: turn.conversation_id, answers: [{ key: 'Q_head_assoc.none', answer: 'not_sure', rephrased: true }] });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_head_onset');

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ simple: true, conversation_id: turn.conversation_id, answers: [{ key: 'Q_head_onset.today', answer: 'today' }] });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'result');
  assert.strictEqual(turn.triage.urgency.level, 'green');
  assert.strictEqual(turn.triage.reason, 'No hurry. You can see a doctor when it is convenient for you.');
});

test('POST /api/ai/chat detects Telugish keywords', async () => {
  const token = await patientToken('ai-telugu@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'kadupu noppi and vantulu' });
  let turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_stomach_loc');

  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'gundelu noppi vastundi' });
  turn = r.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_chest_sev');
});

test('POST /api/ai/chat skips questions already answered in free text', async () => {
  const token = await patientToken('ai-prefill@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  const res = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'I have a mild fever since yesterday and slight body ache' });
  const turn = res.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_fever_assoc');
  assert.ok(!turn.question.options.some((o: { id: string }) => o.id === 'body_ache'));
});

test('POST /api/ai/chat orders categories by mention order', async () => {
  const token = await patientToken('ai-order@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  const res = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'tala noppi and bukhar' });
  const turn = res.body.data;
  assert.strictEqual(turn.type, 'question');
  assert.strictEqual(turn.question.id, 'Q_head_sev');
});
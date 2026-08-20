import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Doctor } from '../src/models/Doctor.js';

export let mem: MongoMemoryServer;

export async function setupDb() {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('medassist_test'));
}

export async function teardownDb() {
  await mongoose.disconnect().catch(() => undefined);
  if (!mem) return;
  await Promise.race([
    mem.stop(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

export const app = () => createApp();

export function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export async function seedDoctor(overrides: Record<string, unknown> = {}) {
  return Doctor.create({
    doctor_id: 'D001',
    name: 'Dr. Test Kumar',
    specialization: 'Orthopedic Specialist',
    department: 'Orthopedics',
    qualification: 'MBBS, MS (Ortho)',
    experience: 10,
    consultation_fee: 500,
    room_number: '101',
    rating: 4.7,
    rating_count: 12,
    availability: ALL_DAYS.map((day) => ({
      day,
      slots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
    })),
    status: 'available',
    ...overrides,
  });
}

export function tokenFrom(json: Record<string, unknown>): string {
  return (json.data as { token: string }).token;
}

export function auth(token: string) {
  return { Authorization: 'Bearer ' + token };
}
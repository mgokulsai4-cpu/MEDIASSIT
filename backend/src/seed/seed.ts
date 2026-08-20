import { connectDatabase, disconnectDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { nextId } from '../utils/idGen.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildDaySlots(): { day: string; slots: string[] }[] {
  const slots: string[] = [];
  for (let h = 9; h < 17; h += 1) {
    if (h === 13) continue; // lunch break
    slots.push(String(h).padStart(2, '0') + ':00');
    slots.push(String(h).padStart(2, '0') + ':30');
  }
  return DAYS.map((day) => ({ day, slots: [...slots] }));
}

const SEED_DOCTORS = [
  { code: 'D001', name: 'Dr. Rajesh Kumar', specialization: 'General Physician', department: 'General Medicine', qualification: 'MBBS, MD (General Medicine)', experience: 15, fee: 400, room: '101', rating: 4.6, rating_count: 320 },
  { code: 'D002', name: 'Dr. Meera Iyer', specialization: 'Cardiologist', department: 'Cardiology', qualification: 'MBBS, MD, DM (Cardiology)', experience: 18, fee: 800, room: '202', rating: 4.8, rating_count: 190 },
  { code: 'D003', name: 'Dr. Suresh Kumar', specialization: 'Orthopedic Specialist', department: 'Orthopedics', qualification: 'MBBS, MS (Ortho)', experience: 12, fee: 600, room: '305', rating: 4.7, rating_count: 240 },
  { code: 'D004', name: 'Dr. Lakshmi Devi', specialization: 'Gynecologist', department: 'Gynecology', qualification: 'MBBS, MD (OBG)', experience: 20, fee: 700, room: '408', rating: 4.9, rating_count: 410 },
  { code: 'D005', name: 'Dr. Anand Venkatesh', specialization: 'Neurologist', department: 'Neurology', qualification: 'MBBS, MD, DM (Neuro)', experience: 14, fee: 900, room: '501', rating: 4.7, rating_count: 150 },
  { code: 'D006', name: 'Dr. Priya Sharma', specialization: 'Dermatologist', department: 'Dermatology', qualification: 'MBBS, MD (Dermatology)', experience: 9, fee: 500, room: '215', rating: 4.5, rating_count: 280 },
  { code: 'D007', name: 'Dr. Nandini Rao', specialization: 'Pediatrician', department: 'Pediatrics', qualification: 'MBBS, MD (Pediatrics)', experience: 11, fee: 500, room: '312', rating: 4.8, rating_count: 350 },
  { code: 'D008', name: 'Dr. Kiran Reddy', specialization: 'ENT Specialist', department: 'ENT', qualification: 'MBBS, MS (ENT)', experience: 13, fee: 450, room: '204', rating: 4.6, rating_count: 210 },
  { code: 'D009', name: 'Dr. Siva Prasad', specialization: 'Pulmonologist', department: 'Pulmonology', qualification: 'MBBS, MD, DM (Pulmonology)', experience: 16, fee: 750, room: '410', rating: 4.7, rating_count: 120 },
  { code: 'D010', name: 'Dr. Deepa Menon', specialization: 'Endocrinologist', department: 'Endocrinology', qualification: 'MBBS, MD, DM (Endocrinology)', experience: 10, fee: 700, room: '206', rating: 4.6, rating_count: 95 },
];

async function seed() {
  const info = await connectDatabase();
  logger.info('Seeding database at ' + info.instanceName);

  for (const d of SEED_DOCTORS) {
    const existing = await Doctor.findOne({ doctor_id: d.code }).lean();
    if (existing) continue;
    await Doctor.create({ ...d, availability: buildDaySlots(), status: 'available' });
  }
  logger.info('Doctors seeded');

  const doctorHash = await bcrypt.hash('Doctor@123', env.bcryptRounds);
  for (const d of SEED_DOCTORS) {
    const email = d.code.toLowerCase() + '@medassist.app';
    const exists = await User.findOne({ email }).lean();
    if (exists) continue;
    const user = await User.create({ user_id: await nextId('U'), name: d.name, email, password_hash: doctorHash, role: 'doctor' });
    await Doctor.updateOne({ doctor_id: d.code }, { user_id: user.user_id });
  }
  logger.info('Doctor accounts seeded');

  const adminEmail = 'admin@medassist.app';
  if (!(await User.findOne({ email: adminEmail }).lean())) {
    await User.create({
      user_id: await nextId('U'),
      name: 'Hospital Admin',
      email: adminEmail,
      password_hash: await bcrypt.hash('Admin@123', env.bcryptRounds),
      role: 'admin',
    });
    logger.info('Admin account seeded');
  }

  const demoEmail = 'gokul@example.com';
  if (!(await User.findOne({ email: demoEmail }).lean())) {
    const user = await User.create({
      user_id: await nextId('U'),
      name: 'Gokul',
      email: demoEmail,
      phone: '9876543210',
      password_hash: await bcrypt.hash('Patient@123', env.bcryptRounds),
      role: 'patient',
    });
    await Patient.create({
      patient_id: await nextId('P'),
      user_id: user.user_id,
      name: 'Gokul',
      age: 28,
      gender: 'male',
      blood_group: 'O+',
      existing_conditions: [],
      allergies: ['Penicillin'],
      medical_history: 'None significant',
      emergency_contact: { name: 'Ravi', phone: '9123456789', relationship: 'Brother' },
    });
    logger.info('Demo patient seeded (gokul@example.com / Patient@123)');
  }

  await disconnectDatabase();
  logger.info('Seed completed');
}

seed().catch((err) => {
  logger.error('Seeding failed', err);
  process.exit(1);
});
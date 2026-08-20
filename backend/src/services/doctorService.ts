import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { Errors } from '../utils/ApiError.js';
import { notify } from './notificationService.js';
import { addDaysIso, toDisplayTime, todayIso, weekdayName } from '../utils/time.js';
import { nextId } from '../utils/idGen.js';

const DEFAULT_SLOTS = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'];
const DEFAULT_WEEKEND_SLOTS = ['10:00 AM', '11:30 AM', '01:00 PM'];

export async function getDoctorForUser(userId: string) {
  const doctor = await Doctor.findOne({ user_id: userId }).lean();
  if (!doctor) throw Errors.notFound('Doctor record not found');
  return doctor;
}

export async function updateDoctorProfile(
  userId: string,
  input: {
    specialization: string;
    department: string;
    hospital: string;
    qualification?: string;
    experience?: number;
    consultation_fee?: number;
    room_number?: string;
    availability?: { day: string; slots: string[] }[];
    status?: 'available' | 'busy' | 'offline';
  },
) {
  const user = await User.findOne({ user_id: userId }).lean();
  if (!user) throw Errors.notFound('User not found');

  const values: Record<string, unknown> = {
    name: user.name,
    user_id: userId,
    specialization: input.specialization.trim(),
    department: input.department.trim(),
    hospital: input.hospital.trim(),
    qualification: input.qualification?.trim() ?? '',
    experience: input.experience ?? 0,
    consultation_fee: input.consultation_fee ?? 0,
    room_number: input.room_number?.trim() ?? '',
    status: input.status ?? 'available',
  };
  if (input.availability !== undefined) values.availability = input.availability;

  const previous = await Doctor.findOne({ user_id: userId }).select('status doctor_id name').lean();
  const updated = await Doctor.findOneAndUpdate(
    { user_id: userId },
    { $set: values, $setOnInsert: { doctor_id: await nextId('D') } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();
  if (updated && previous?.status !== 'available' && updated.status === 'available') {
    await notifyDoctorAvailable(updated.doctor_id, updated.name);
  }
  return updated;
}

export async function updateDoctorStatus(userId: string, status: 'available' | 'busy' | 'offline') {
  const doctor = await getDoctorForUser(userId);
  const previous = doctor.status;
  const updated = await Doctor.findOneAndUpdate(
    { doctor_id: doctor.doctor_id },
    { $set: { status } },
    { returnDocument: 'after' },
  ).lean();
  if (previous !== 'available' && status === 'available') {
    await notifyDoctorAvailable(doctor.doctor_id, doctor.name);
  }
  return updated;
}

export async function notifyDoctorAvailable(doctorId: string, doctorName: string) {
  const appointments = await Appointment.find({
    doctor_id: doctorId,
    status: { $in: ['scheduled', 'confirmed', 'in_queue'] },
  })
    .select('patient_id')
    .lean();
  const patientIds = [...new Set(appointments.map((row) => row.patient_id))];
  const patients = await Patient.find({ patient_id: { $in: patientIds } })
    .select('user_id')
    .lean();
  for (const patient of patients) {
    if (patient.user_id) {
      await notify.doctorAvailable(patient.user_id, doctorName, doctorId);
    }
  }
}

export async function listDoctors(specialty?: string) {
  const query = specialty ? { specialization: specialty } : {};
  return Doctor.find(query).select('-__v').sort({ rating: -1 }).lean();
}

export async function getDoctor(doctorId: string) {
  const doctor = await Doctor.findOne({ doctor_id: doctorId }).select('-__v').lean();
  if (!doctor) throw Errors.notFound('Doctor not found');
  return doctor;
}

export async function getAvailability(doctorId: string, requestedDate?: string) {
  const doctor = await getDoctor(doctorId);
  const date =
    requestedDate && !Number.isNaN(Date.parse(requestedDate + 'T00:00:00'))
      ? requestedDate
      : addDaysIso(0);
  const dayName = weekdayName(date);
  const row = doctor.availability?.find((a) => a.day === dayName);
  const rawSlots = row?.slots?.length
    ? row.slots
    : dayName === 'Sunday'
      ? []
      : dayName === 'Saturday'
        ? DEFAULT_WEEKEND_SLOTS
        : DEFAULT_SLOTS;

  const booked = await Appointment.find({
    doctor_id: doctorId,
    date,
    status: { $nin: ['cancelled', 'no_show'] },
  })
    .select('time')
    .lean();
  const bookedSet = new Set(booked.map((b) => b.time));

  const isToday = date === todayIso();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const slots = rawSlots
    .map((slot) => toDisplayTime(slot))
    .filter((slot) => !bookedSet.has(slot))
    .filter((slot) => {
      if (!isToday) return true;
      const [hRaw, mRaw] = slot.split(':');
      const h = parseInt(hRaw, 10);
      const m = parseInt(mRaw ?? '0', 10);
      const period = slot.includes('PM') && h < 12 ? 12 : 0;
      return h * 60 + m + period > nowMin + 30;
    });

  return { doctor, date, day: dayName, slots, isToday };
}

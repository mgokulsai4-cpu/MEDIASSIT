import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Errors } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { nextId } from '../utils/idGen.js';

const PUBLIC_USER_SELECT = '-password_hash -push_tokens -__v';

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: 'patient' | 'doctor';
  age?: number;
  gender?: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  role?: 'patient' | 'doctor';
}

function signToken(user: { user_id: string; role: string; name: string }): string {
  return jwt.sign(
    { role: user.role, name: user.name },
    env.jwtSecret,
    { subject: user.user_id, expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

async function publicUser(userId: string) {
  return User.findOne({ user_id: userId }).select(PUBLIC_USER_SELECT).lean();
}

export async function register(input: RegisterInput) {
  const role = input.role === 'doctor' ? 'doctor' : 'patient';
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() ?? '';

  const existingEmail = await User.findOne({ email }).lean();
  if (existingEmail) throw Errors.conflict('Email already exists');

  if (phone) {
    const existingPhone = await User.findOne({ phone }).lean();
    if (existingPhone) throw Errors.conflict('Phone number already exists');
  }

  const user_id = await nextId('U');
  const password_hash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = await User.create({
    user_id,
    name,
    email,
    phone,
    password_hash,
    role,
  });

  let patient: unknown = null;
  if (role === 'patient') {
    patient = await Patient.create({
      patient_id: await nextId('P'),
      user_id,
      name,
      age: input.age,
      gender: (input.gender ?? '') as '' | 'male' | 'female' | 'other',
    });
  }

  logger.audit('auth-register', { user_id, role });
  return { user: await publicUser(user_id), patient, token: signToken(user) };
}

export async function login(input: LoginInput) {
  const identifier = input.identifier.trim();
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  }).lean();
  if (!user) throw Errors.unauthorized('Invalid email/phone or password');
  if (input.role && user.role !== input.role) {
    throw Errors.unauthorized(`This account is registered as a ${user.role}`);
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw Errors.unauthorized('Invalid email/phone or password');

  let patient = null;
  let doctor = null;
  if (user.role === 'patient') {
    patient = await Patient.findOne({ user_id: user.user_id }).lean();
  }
  if (user.role === 'doctor') {
    doctor = await Doctor.findOne({ user_id: user.user_id }).lean();
  }

  logger.audit('auth-login', { user_id: user.user_id, role: user.role });
  return {
    user: { ...user, password_hash: undefined, push_tokens: undefined },
    patient,
    doctor,
    token: signToken(user),
  };
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await User.findOne({ user_id: userId });
  if (!user) throw Errors.notFound('User not found');
  const ok = await bcrypt.compare(current, user.password_hash);
  if (!ok) throw Errors.badRequest('Current password is incorrect');
  user.password_hash = await bcrypt.hash(next, env.bcryptRounds);
  await user.save();
  logger.audit('auth-password-change', { user_id: userId });
  return true;
}

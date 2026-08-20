import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';

type Gender = '' | 'male' | 'female' | 'other';
type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';

/** Return the linked patient record for an authenticated user. */
export async function getPatientForUser(userId: string) {
  const user = await User.findOne({ user_id: userId }).lean();
  if (!user) throw Errors.notFound('User not found');
  let patient = await Patient.findOne({ user_id: userId }).lean();
  if (!patient && user.role === 'patient') {
    patient = await Patient.create({
      patient_id: await nextId('P'),
      user_id: userId,
      name: user.name,
    });
  }
  return patient;
}

export async function getPatientByPatientId(patientId: string) {
  const patient = await Patient.findOne({ patient_id: patientId }).lean();
  if (!patient) throw Errors.notFound('Patient profile not found');
  return patient;
}

export async function updatePatientProfile(
  patientId: string,
  input: {
    age?: number;
    gender?: string;
    blood_group?: string;
    existing_conditions?: string[];
    allergies?: string[];
    medical_history?: string;
    emergency_contact?: { name?: string; phone?: string; relationship?: string };
  },
) {
  const patient = await Patient.findOne({ patient_id: patientId });
  if (!patient) throw Errors.notFound('Patient profile not found');
  if (input.age !== undefined) patient.age = input.age;
  if (input.gender !== undefined) patient.gender = input.gender as Gender;
  if (input.blood_group !== undefined) patient.blood_group = input.blood_group as BloodGroup;
  if (input.existing_conditions !== undefined) patient.existing_conditions = input.existing_conditions;
  if (input.allergies !== undefined) patient.allergies = input.allergies;
  if (input.medical_history !== undefined) patient.medical_history = input.medical_history;
  if (input.emergency_contact) {
    patient.emergency_contact = {
      name: input.emergency_contact.name ?? patient.emergency_contact?.name ?? '',
      phone: input.emergency_contact.phone ?? patient.emergency_contact?.phone ?? '',
      relationship: input.emergency_contact.relationship ?? patient.emergency_contact?.relationship ?? '',
    };
  }
  await patient.save();
  return patient;
}
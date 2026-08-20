import { FamilyLink } from '../models/FamilyLink.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { logger } from '../utils/logger.js';

const RELATIONS = ['parent', 'child', 'spouse', 'sibling', 'other'] as const;
export type FamilyRelation = (typeof RELATIONS)[number];

function normalizeRelation(relation: string): FamilyRelation {
  return (RELATIONS as readonly string[]).includes(relation) ? (relation as FamilyRelation) : 'other';
}

export interface FamilyMemberView {
  link_id: string;
  relation: string;
  user: { user_id: string; name: string; email: string; phone?: string };
  patient: { patient_id: string; name: string; age?: number | null; gender?: string } | null;
  created_at: Date;
}

export async function addFamilyMember(
  guardianUserId: string,
  memberEmail: string,
  relation: string,
): Promise<FamilyMemberView> {
  const member = await User.findOne({ email: memberEmail.toLowerCase().trim() }).lean();
  if (!member) throw Errors.notFound('No account found with this email');
  if (member.user_id === guardianUserId) throw Errors.badRequest('You cannot link yourself');
  if (member.role !== 'patient') throw Errors.badRequest('Only patient accounts can be linked');

  const existing = await FamilyLink.findOne({
    guardian_user_id: guardianUserId,
    member_user_id: member.user_id,
  }).lean();
  if (existing) throw Errors.badRequest('This member is already linked');

  const link = await FamilyLink.create({
    link_id: await nextId('F'),
    guardian_user_id: guardianUserId,
    member_user_id: member.user_id,
    relation: normalizeRelation(relation),
  });

  const patient = await Patient.findOne({ user_id: member.user_id })
    .select('patient_id name age gender')
    .lean();
  logger.audit('family-link-create', { guardian_user_id: guardianUserId, member_user_id: member.user_id });
  return {
    link_id: link.link_id,
    relation: link.relation,
    user: { user_id: member.user_id, name: member.name, email: member.email, phone: member.phone ?? '' },
    patient: patient
      ? { patient_id: patient.patient_id, name: patient.name, age: patient.age ?? null, gender: patient.gender }
      : null,
    created_at: link.created_at,
  };
}

export async function listFamilyMembers(guardianUserId: string): Promise<FamilyMemberView[]> {
  const links = await FamilyLink.find({ guardian_user_id: guardianUserId }).sort({ created_at: -1 }).lean();
  if (links.length === 0) return [];
  const memberIds = links.map((l) => l.member_user_id);
  const members = await User.find({ user_id: { $in: memberIds } }).lean();
  const patients = await Patient.find({ user_id: { $in: memberIds } })
    .select('patient_id user_id name age gender')
    .lean();
  const memberMap = new Map(members.map((m) => [m.user_id, m]));
  const patientMap = new Map(patients.map((p) => [p.user_id, p]));
  return links.map((link) => {
    const member = memberMap.get(link.member_user_id);
    const patient = patientMap.get(link.member_user_id);
    return {
      link_id: link.link_id,
      relation: link.relation,
      user: member
        ? { user_id: member.user_id, name: member.name, email: member.email, phone: member.phone ?? '' }
        : { user_id: link.member_user_id, name: 'Unknown', email: '', phone: '' },
      patient: patient
        ? { patient_id: patient.patient_id, name: patient.name, age: patient.age ?? null, gender: patient.gender }
        : null,
      created_at: link.created_at,
    };
  });
}

export async function removeFamilyMember(guardianUserId: string, memberUserId: string): Promise<void> {
  const link = await FamilyLink.findOneAndDelete({
    guardian_user_id: guardianUserId,
    member_user_id: memberUserId,
  }).lean();
  if (!link) throw Errors.notFound('Family link not found');
  logger.audit('family-link-remove', { guardian_user_id: guardianUserId, member_user_id: memberUserId });
}

export async function canAccessPatient(guardianUserId: string, patientId: string): Promise<boolean> {
  const patient = await Patient.findOne({ patient_id: patientId }).select('user_id').lean();
  if (!patient) return false;
  if (patient.user_id === guardianUserId) return true;
  const link = await FamilyLink.findOne({
    guardian_user_id: guardianUserId,
    member_user_id: patient.user_id,
  }).lean();
  return !!link;
}
import { Request, Response } from 'express';
import {
  addFamilyMember,
  listFamilyMembers,
  removeFamilyMember,
} from '../services/familyService.js';
import { Errors } from '../utils/ApiError.js';

export async function handleAddFamilyMember(req: Request, res: Response) {
  if (req.user!.role !== 'patient') throw Errors.forbidden('Only patient accounts can link family members');
  const { email, relation } = req.body as { email: string; relation?: string };
  const member = await addFamilyMember(req.user!.user_id, email, relation ?? 'other');
  res.status(201).json({ success: true, data: member });
}

export async function handleListFamilyMembers(req: Request, res: Response) {
  const members = await listFamilyMembers(req.user!.user_id);
  res.json({ success: true, data: members });
}

export async function handleRemoveFamilyMember(req: Request, res: Response) {
  await removeFamilyMember(req.user!.user_id, String(req.params.userId));
  res.json({ success: true, message: 'Family member removed' });
}
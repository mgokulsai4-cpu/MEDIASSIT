import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  handleAddFamilyMember,
  handleListFamilyMembers,
  handleRemoveFamilyMember,
} from '../controllers/familyController.js';

export const familyRouter = Router();

familyRouter.use(requireAuth);

familyRouter.get('/', handleListFamilyMembers);
familyRouter.post(
  '/',
  body('email').isEmail().withMessage('A valid email is required'),
  body('relation').optional().isIn(['parent', 'child', 'spouse', 'sibling', 'other']),
  validate,
  handleAddFamilyMember,
);
familyRouter.delete('/:userId', handleRemoveFamilyMember);
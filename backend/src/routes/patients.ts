import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  handleGetProfile,
  handleGetProfileById,
  handleRegisterPushToken,
  handleUpdateProfile,
} from '../controllers/patientController.js';

export const patientRouter = Router();

patientRouter.use(requireAuth);

patientRouter.get('/me', handleGetProfile);
patientRouter.patch(
  '/me',
  body('age').optional().isInt({ min: 0, max: 130 }),
  body('gender').optional().isIn(['male', 'female', 'other', '']),
  body('blood_group').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']),
  body('existing_conditions').optional().isArray(),
  body('allergies').optional().isArray(),
  body('medical_history').optional().trim(),
  validate,
  handleUpdateProfile,
);
patientRouter.post('/notifications', handleRegisterPushToken);
patientRouter.get('/:id', handleGetProfileById);
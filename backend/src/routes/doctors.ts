import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  handleAvailability,
  handleGetDoctor,
  handleGetMyDoctor,
  handleListDoctors,
  handleUpdateMyDoctor,
  handleUpdateMyStatus,
} from '../controllers/doctorController.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';

export const doctorRouter = Router();

doctorRouter.use(requireAuth);
doctorRouter.get('/', handleListDoctors);
doctorRouter.get('/me', handleGetMyDoctor);
doctorRouter.patch(
  '/me/status',
  body('status').isIn(['available', 'busy', 'offline']).withMessage('Invalid status'),
  validate,
  handleUpdateMyStatus,
);
doctorRouter.patch(
  '/me',
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('hospital').trim().notEmpty().withMessage('Hospital or clinic is required'),
  body('qualification').optional({ values: 'falsy' }).trim(),
  body('experience').optional({ values: 'falsy' }).isInt({ min: 0, max: 80 }).withMessage('Experience must be a whole number from 0 to 80').toInt(),
  body('consultation_fee').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Consultation fee must be a number').toFloat(),
  body('room_number').optional({ values: 'falsy' }).trim(),
  body('availability').optional({ values: 'falsy' }).isArray().withMessage('Availability must be an array'),
  body('status').optional({ values: 'falsy' }).isIn(['available', 'busy', 'offline']),
  validate,
  handleUpdateMyDoctor,
);
doctorRouter.get('/:id/availability', handleAvailability);
doctorRouter.get('/:id', handleGetDoctor);

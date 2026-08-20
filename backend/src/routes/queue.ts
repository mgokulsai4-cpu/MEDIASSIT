import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleActiveQueue,
  handleDoctorQueue,
  handleGetQueue,
  handleJoinQueue,
  handleOverridePriority,
  handlePatientQueue,
  handlePatientCancelQueue,
  handleUpdateQueue,
} from '../controllers/queueController.js';

export const queueRouter = Router();

queueRouter.use(requireAuth);

queueRouter.get('/active', handleActiveQueue);
queueRouter.post('/join', body('appointment_id').notEmpty().withMessage('appointment_id is required'), validate, handleJoinQueue);
queueRouter.get('/:id', handleGetQueue);
queueRouter.patch('/:id/cancel', handlePatientCancelQueue);
queueRouter.get('/doctor/:doctorId', handleDoctorQueue);
queueRouter.get('/patient/:patientId', handlePatientQueue);
queueRouter.patch('/:id', requireRoles('doctor', 'admin'), handleUpdateQueue);
queueRouter.patch(
  '/:id/override',
  requireRoles('doctor', 'admin'),
  body('priority_score').isFloat({ min: 1 }).withMessage('priority_score must be a positive number'),
  body('reason').optional().trim().isLength({ max: 300 }),
  validate,
  handleOverridePriority,
);

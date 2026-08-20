import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleCreatePrescription,
  handleGetPrescription,
  handleListDoctorPrescriptions,
  handleListOwnPrescriptions,
  handleListPatientPrescriptions,
} from '../controllers/prescriptionController.js';

export const prescriptionRouter = Router();

prescriptionRouter.use(requireAuth);

prescriptionRouter.get('/doctor', requireRoles('doctor', 'admin'), handleListDoctorPrescriptions);
prescriptionRouter.get('/patient/:patientId', handleListPatientPrescriptions);
prescriptionRouter.get('/me', handleListOwnPrescriptions);
prescriptionRouter.get('/:id', handleGetPrescription);
prescriptionRouter.post(
  '/',
  requireRoles('doctor', 'admin'),
  body('patient_id').notEmpty().withMessage('patient_id is required'),
  body('appointment_id').notEmpty().withMessage('appointment_id is required'),
  body('medications').optional().isArray(),
  validate,
  handleCreatePrescription,
);
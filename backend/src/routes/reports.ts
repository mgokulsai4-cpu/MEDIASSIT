import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleCreateReport,
  handleGetReport,
  handleListDoctorReports,
  handleListReports,
  handleSummarizeReport,
} from '../controllers/reportController.js';

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.post(
  '/',
  requireRoles('doctor', 'admin'),
  body('patient_id').notEmpty().withMessage('patient_id is required'),
  body('appointment_id').notEmpty().withMessage('appointment_id is required'),
  body('doctor_diagnosis').trim().notEmpty().withMessage('Doctor diagnosis is required'),
  body('symptoms').optional().isArray(),
  validate,
  handleCreateReport,
);

reportRouter.get('/doctor', requireRoles('doctor', 'admin'), handleListDoctorReports);
reportRouter.get('/patient/:patientId', handleListReports);
reportRouter.get('/:id', handleGetReport);
reportRouter.post('/:id/summarize', requireRoles('patient', 'doctor', 'admin'), handleSummarizeReport);
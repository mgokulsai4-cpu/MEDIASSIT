import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleCreateAppointment,
  handleListAppointments,
  handleListMyAppointments,
  handleUpdateAppointment,
} from '../controllers/appointmentController.js';

export const appointmentRouter = Router();

appointmentRouter.use(requireAuth);

appointmentRouter.post(
  '/',
  body('doctor_id').notEmpty().withMessage('doctor_id is required'),
  body('date').isDate().withMessage('A valid date (YYYY-MM-DD) is required'),
  body('time').notEmpty().withMessage('time is required'),
  body('hospital').optional().trim().isLength({ max: 160 }).withMessage('Hospital name is too long'),
  body('urgency').optional().isIn(['green', 'yellow', 'orange', 'red']),
  validate,
  handleCreateAppointment,
);

appointmentRouter.get('/', handleListMyAppointments);

appointmentRouter.get('/doctor/:doctorId', requireRoles('doctor', 'admin'), (req, res) =>
  res.status(501).json({ success: false, message: 'Use the queue endpoints for doctor schedules' }),
);

appointmentRouter.get('/patient/:patientId', handleListAppointments);
appointmentRouter.patch('/:id', handleUpdateAppointment);

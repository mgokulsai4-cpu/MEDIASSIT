import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  handleStartPreConsult,
  handlePreConsultAnswer,
  handleGetPreConsult,
} from '../controllers/preconsultController.js';

export const preconsultRouter = Router();

preconsultRouter.use(requireAuth);

preconsultRouter.post('/start', handleStartPreConsult);
preconsultRouter.post('/answer', handlePreConsultAnswer);
preconsultRouter.get('/:appointmentId', handleGetPreConsult);

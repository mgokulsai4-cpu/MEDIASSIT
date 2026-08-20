import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleOwnTimeline, handlePatientTimeline } from '../controllers/timelineController.js';

export const timelineRouter = Router();

timelineRouter.use(requireAuth);

timelineRouter.get('/me', handleOwnTimeline);
timelineRouter.get('/patient/:patientId', handlePatientTimeline);
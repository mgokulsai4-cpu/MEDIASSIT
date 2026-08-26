import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleRecommendSlots } from '../controllers/slotController.js';

export const slotRouter = Router();

slotRouter.use(requireAuth);

slotRouter.post('/recommend', handleRecommendSlots);

import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { handleChat, handleHealth, handleTriage } from '../controllers/aiController.js';

export const aiRouter = Router();

aiRouter.get('/health', requireAuth, handleHealth);
aiRouter.post(
  '/chat',
  requireAuth,
  body('message').optional().trim(),
  body('conversation_id').optional().trim(),
  body('answers').optional().isArray(),
  validate,
  handleChat,
);
aiRouter.post(
  '/triage',
  requireAuth,
  body('messages').isArray().withMessage('messages array is required'),
  validate,
  handleTriage,
);
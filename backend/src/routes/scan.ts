import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  handleGetScan,
  handleListScans,
  handleScanImage,
} from '../controllers/scanController.js';

export const scanRouter = Router();

scanRouter.use(requireAuth);

scanRouter.get('/list', handleListScans);
scanRouter.get('/:id', handleGetScan);
scanRouter.post(
  '/',
  body('image_base64').notEmpty().withMessage('image_base64 is required'),
  validate,
  handleScanImage,
);
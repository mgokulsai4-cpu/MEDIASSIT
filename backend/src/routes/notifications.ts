import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleListNotifications, handleMarkNotificationRead } from '../controllers/notificationController.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get('/', handleListNotifications);
notificationRouter.patch('/:id/read', handleMarkNotificationRead);

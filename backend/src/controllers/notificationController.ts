import { Request, Response } from 'express';
import { listNotifications, markNotificationRead } from '../services/notificationService.js';
import { Errors } from '../utils/ApiError.js';

export async function handleListNotifications(req: Request, res: Response) {
  const rows = await listNotifications(req.user!.user_id);
  res.json({ success: true, data: rows });
}

export async function handleMarkNotificationRead(req: Request, res: Response) {
  const notificationId = String(req.params.id || '');
  if (!notificationId) throw Errors.badRequest('notification id is required');
  const row = await markNotificationRead(req.user!.user_id, notificationId);
  if (!row) throw Errors.notFound('Notification not found');
  res.json({ success: true, data: row });
}

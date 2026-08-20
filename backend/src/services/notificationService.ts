import { Expo } from 'expo-server-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { nextId } from '../utils/idGen.js';

let expo: Expo | null = null;
if (env.expoAccessToken) {
  try {
    expo = new Expo({ accessToken: env.expoAccessToken });
  } catch (err) {
    logger.warn('Invalid EXPO_ACCESS_TOKEN - push delivery disabled: ' + String(err));
  }
}

function getExpo(): Expo | null {
  if (!expo && env.expoAccessToken) {
    try {
      expo = new Expo({ accessToken: env.expoAccessToken });
    } catch {
      expo = null;
    }
  }
  return expo;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function registerPushToken(
  userId: string,
  token: string,
  deviceType: string,
): Promise<void> {
  await User.updateOne(
    { user_id: userId },
    { $addToSet: { push_tokens: { token, device_type: deviceType } } },
  );
}

export async function listNotifications(userId: string, limit = 50) {
  return Notification.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return Notification.findOneAndUpdate(
    { notification_id: notificationId, user_id: userId },
    { $set: { read: true } },
    { returnDocument: 'after' },
  ).lean();
}

async function persistNotification(userId: string, payload: PushPayload & { type: string }) {
  const notification_id = await nextId('N', 3);
  await Notification.create({
    notification_id,
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    read: false,
  });
  return notification_id;
}

export async function sendToUser(userId: string | undefined, payload: PushPayload & { type?: string }): Promise<boolean> {
  if (!userId) return false;
  if (payload.type) {
    try {
      await persistNotification(userId, { ...payload, type: payload.type });
    } catch (err) {
      logger.warn('Failed to persist notification: ' + String(err));
    }
  }
  if (!getExpo()) {
    logger.info(
      'Push delivery disabled (EXPO_ACCESS_TOKEN not configured). Would send: ' +
        payload.title + ' - ' + payload.body,
    );
    return Boolean(payload.type);
  }
  const user = await User.findOne({ user_id: userId }).select('push_tokens').lean();
  const tokens = (user?.push_tokens ?? []).map((t) => (t as { token: string }).token);
  return sendToTokens(tokens, payload);
}

export async function sendToTokens(tokens: string[], payload: PushPayload): Promise<boolean> {
  if (tokens.length === 0) return false;
  const client = getExpo();
  if (!client) {
    logger.info(
      'Push delivery disabled (EXPO_ACCESS_TOKEN not configured). Would send: ' +
        payload.title + ' - ' + payload.body,
    );
    return false;
  }
  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t))
    .map((t) => ({
      to: t,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));
  if (messages.length === 0) return false;
  try {
    const chunks = client.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await client.sendPushNotificationsAsync(chunk);
    }
    logger.audit('push-sent', { count: messages.length });
    return true;
  } catch (err) {
    logger.error('Push send failed', err);
    return false;
  }
}

export const notify = {
  appointmentConfirmed: (userId: string, appointmentId: string, doctorName: string, date: string, time: string) =>
    sendToUser(userId, {
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      body: 'Your appointment with ' + doctorName + ' on ' + date + ' at ' + time + ' is confirmed. ID: ' + appointmentId,
      data: { type: 'appointment', appointment_id: appointmentId },
    }),
  appointmentReminder: (userId: string, appointmentId: string, doctorName: string, date: string, time: string) =>
    sendToUser(userId, {
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      body: 'Reminder: appointment with ' + doctorName + ' is ' + date + ' at ' + time + '.',
      data: { type: 'appointment', appointment_id: appointmentId },
    }),
  queueUpdate: (userId: string, queueId: string, position: number, waitMinutes: number) =>
    sendToUser(userId, {
      type: 'queue_update',
      title: 'Queue Update',
      body: 'Your queue position is #' + position + '. Estimated wait: ' + waitMinutes + ' minutes.',
      data: { type: 'queue', queue_id: queueId, position, wait_minutes: waitMinutes },
    }),
  doctorCalling: (userId: string, queueId: string) =>
    sendToUser(userId, {
      type: 'doctor_calling',
      title: 'Doctor is calling you',
      body: 'It is almost your turn - please get ready. Token: ' + queueId + '.',
      data: { type: 'queue', queue_id: queueId },
    }),
  doctorAvailable: (userId: string, doctorName: string, doctorId: string) =>
    sendToUser(userId, {
      type: 'doctor_availability',
      title: 'Doctor available',
      body: doctorName + ' is now available for your upcoming appointment.',
      data: { type: 'doctor_availability', doctor_id: doctorId },
    }),
  appointmentCancelled: (userId: string, appointmentId: string) =>
    sendToUser(userId, {
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      body: 'Your appointment ' + appointmentId + ' has been cancelled.',
      data: { type: 'appointment', appointment_id: appointmentId },
    }),
  reportReady: (userId: string, reportId: string) =>
    sendToUser(userId, {
      type: 'report_ready',
      title: 'Medical Report Ready',
      body: 'Your medical report ' + reportId + ' is ready, including an AI summary.',
      data: { type: 'report', report_id: reportId },
    }),
};

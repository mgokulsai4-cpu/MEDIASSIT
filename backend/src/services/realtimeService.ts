import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

let io: Server | null = null;

export interface QueueUpdatePayload {
  queue_id: string;
  position?: number;
  waiting_time?: number;
  status?: string;
  eta_minutes?: number;
  timestamp: number;
}

export function initRealtime(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'));
      }
      const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
      const sub = payload.sub as string | undefined;
      if (!sub) return next(new Error('Invalid token'));
      const user = await User.findOne({ user_id: sub }).select('-password_hash').lean();
      if (!user) return next(new Error('Account no longer exists'));
      (socket as any).user = { user_id: user.user_id, role: user.role, name: user.name };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info(`WebSocket connected: ${user?.user_id}`);

    socket.on('queue:subscribe', (queueId: string) => {
      if (typeof queueId === 'string' && queueId) socket.join('queue:' + queueId);
    });
    socket.on('queue:unsubscribe', (queueId: string) => {
      if (typeof queueId === 'string' && queueId) socket.leave('queue:' + queueId);
    });
    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${user?.user_id}`);
    });
  });
  return io;
}

export function emitQueueUpdate(queueId: string, payload: Omit<QueueUpdatePayload, 'timestamp'>) {
  if (!io) return;
  io.to('queue:' + queueId).emit('queue:update', { ...payload, timestamp: Date.now() });
}

export function getIO(): Server | null {
  return io;
}
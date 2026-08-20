import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

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
  io.on('connection', (socket) => {
    socket.on('queue:subscribe', (queueId: string) => {
      if (typeof queueId === 'string' && queueId) socket.join('queue:' + queueId);
    });
    socket.on('queue:unsubscribe', (queueId: string) => {
      if (typeof queueId === 'string' && queueId) socket.leave('queue:' + queueId);
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
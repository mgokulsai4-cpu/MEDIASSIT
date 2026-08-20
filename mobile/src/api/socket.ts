import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '../constants/api';

let socket: Socket | null = null;

export interface QueueLiveUpdate {
  queue_id: string;
  position?: number;
  waiting_time?: number;
  status?: string;
  eta_minutes?: number;
  timestamp: number;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function subscribeQueue(
  queueId: string,
  onUpdate: (payload: QueueLiveUpdate) => void,
): () => void {
  const s = getSocket();
  s.on('queue:update', onUpdate);
  s.emit('queue:subscribe', queueId);
  return () => {
    s.off('queue:update', onUpdate);
    s.emit('queue:unsubscribe', queueId);
  };
}
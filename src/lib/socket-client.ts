'use client';

import { io, Socket } from 'socket.io-client';
import { SOCKET_PATH } from './socket-config';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/game';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
  if (!socket) {
    socket = io({
      path: SOCKET_PATH,
      // 'websocket' first means engine.io opens DIRECTLY on a WebSocket instead of
      // the default polling-then-upgrade dance, saving two round-trips on connect.
      // That matters a lot for players on ~300ms links.
      transports: ['websocket', 'polling'],
      // Without this, engine.io never actually falls back to the second transport:
      // it retries WebSocket forever. Some carrier proxies and school firewalls
      // block WebSocket outright, and those students could never connect at all.
      // Costs nothing on the happy path, since 'websocket' is still tried first.
      tryAllTransports: true,
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 
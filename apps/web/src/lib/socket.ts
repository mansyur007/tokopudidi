'use client';

import { io, Socket } from 'socket.io-client';

// Singleton — hindari koneksi duplikat saat re-render.
let socket: Socket | null = null;
let currentToken: string | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getSocket(token: string | null): Socket | null {
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
      currentToken = null;
    }
    return null;
  }
  if (socket && currentToken === token) return socket;
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  currentToken = token;
  return socket;
}

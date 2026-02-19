// WebSocket event types shared between client and server
// Event names use colon-separated namespacing (e.g., "presence:online")

import type { Notification } from './models';

// -- Client -> Server Events --

export interface ClientToServerEvents {
  /** Signal online presence */
  'presence:online': () => void;
}

// -- Server -> Client Events --

export interface ServerToClientEvents {
  /** New notification for the user */
  notification: (notification: Notification) => void;

  /** User presence update */
  'presence:update': (data: { userId: string; status: 'online' | 'offline' }) => void;

  /** Error event */
  error: (data: { message: string }) => void;
}

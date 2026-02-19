import { NotificationType } from '@prisma/client';
import { prisma } from '../db';

// Generic writer interface for SSE - works with both Express Response and ReadableStream
export interface SSEWriter {
  write(data: string): void;
}

// SSE client registry: userId -> Set of SSEWriter objects
const sseClients = new Map<string, Set<SSEWriter>>();
const MAX_SSE_CONNECTIONS_PER_USER = 5;

export function addSSEClient(userId: string, writer: SSEWriter): boolean {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  const clients = sseClients.get(userId)!;
  if (clients.size >= MAX_SSE_CONNECTIONS_PER_USER) {
    return false;
  }
  clients.add(writer);
  return true;
}

export function removeSSEClient(userId: string, writer: SSEWriter) {
  const clients = sseClients.get(userId);
  if (clients) {
    clients.delete(writer);
    if (clients.size === 0) {
      sseClients.delete(userId);
    }
  }
}

function sendSSEEvent(userId: string, event: string, data: unknown) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const writer of Array.from(clients)) {
    try {
      writer.write(payload);
    } catch {
      // Client disconnected, will be cleaned up
    }
  }
}

interface CreateNotificationInput {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  targetId?: string;
  targetType?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  // Don't notify yourself
  if (input.recipientId === input.actorId) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      recipientId: input.recipientId,
      actorId: input.actorId,
      targetId: input.targetId,
      targetType: input.targetType,
    },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Send real-time notification via SSE
  sendSSEEvent(input.recipientId, 'notification', notification);

  return notification;
}

export async function getNotifications(userId: string, cursor?: string, limit = 20) {
  let cursorDate: Date | undefined;
  if (cursor) {
    const cursorNotification = await prisma.notification.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (!cursorNotification) {
      return { data: [], nextCursor: null, hasMore: false };
    }
    cursorDate = cursorNotification.createdAt;
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const data = hasMore ? notifications.slice(0, limit) : notifications;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: userId, read: false },
  });
}

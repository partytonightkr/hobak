import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { paginationSchema } from '../utils/pagination';
import * as notificationService from '../services/notification.service';
import { addSSEClient, removeSSEClient } from '../services/notification.service';

const router = Router();

// GET /notifications/stream - SSE endpoint for real-time notifications
router.get('/stream', authenticate, (req: Request, res: Response) => {
  const userId = req.user!.userId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const accepted = addSSEClient(userId, res);
  if (!accepted) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Too many connections' })}\n\n`);
    res.end();
    return;
  }

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Send heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(userId, res);
  });
});

// GET /notifications
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await notificationService.getNotifications(
      req.user!.userId,
      pagination.cursor,
      pagination.limit,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /notifications/unread-count
router.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markNotificationRead(req.params.id, req.user!.userId);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// POST /notifications/read-all
router.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllNotificationsRead(req.user!.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;

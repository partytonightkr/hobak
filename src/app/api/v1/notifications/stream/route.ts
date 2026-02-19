import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { addSSEClient, removeSSEClient, SSEWriter } from '@/lib/server/services/notification.service';

export const dynamic = 'force-dynamic';

// GET /api/v1/notifications/stream - SSE endpoint for real-time notifications
export async function GET(req: NextRequest) {
  const user = requireAuth();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const writer: SSEWriter = {
        write(data: string) {
          controller.enqueue(encoder.encode(data));
        },
      };

      const accepted = addSSEClient(user.userId, writer);
      if (!accepted) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: 'Too many connections' })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ userId: user.userId })}\n\n`,
        ),
      );

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeSSEClient(user.userId, writer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

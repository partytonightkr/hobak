import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import fs from 'fs';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { getSafeContentType } from './services/upload.service';
import { connectRedis, disconnectRedis } from './config/redis';
import { createRateLimiters } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import {
  securityHeaders,
  validateOrigin,
  additionalSecurityHeaders,
  validateProductionSecrets,
} from './middleware/security.middleware';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import postsRoutes from './routes/posts.routes';
import commentsRoutes from './routes/comments.routes';
// DMs deferred to v1.1 - messages routes not mounted
// import messagesRoutes from './routes/messages.routes';
import notificationsRoutes from './routes/notifications.routes';
import searchRoutes from './routes/search.routes';
import paymentsRoutes from './routes/payments.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import medicalRoutes, { medicalShareRouter } from './routes/medical.routes';
import parksRoutes from './routes/parks.routes';
import alertsRoutes from './routes/alerts.routes';
import aiAgentRoutes from './routes/ai-agent.routes';
import dogsRoutes from './routes/dogs.routes';

async function main() {
  // Validate production secrets before starting
  validateProductionSecrets();

  // Connect to database
  await prisma.$connect();
  console.log('[DB] Connected to database');

  // Connect to Redis (gracefully falls back to memory if unavailable)
  const redisClient = await connectRedis();

  const app = express();

  // Global middleware -- security headers (replaces basic helmet)
  app.use(securityHeaders);
  app.use(additionalSecurityHeaders);
  app.use(validateOrigin);
  app.use(cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }));
  app.use(cookieParser());

  // Stripe webhook needs raw body - mount before JSON parser
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  // Create rate limiters after Redis is connected so they can use Redis store
  const { generalLimiter } = createRateLimiters();
  app.use(generalLimiter);

  // Serve uploaded files with explicit safe Content-Type headers
  const uploadsDir = path.resolve(env.UPLOAD_DIR);
  app.get('/uploads/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // prevent directory traversal
    const filePath = path.join(uploadsDir, filename);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', getSafeContentType(filename));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  });

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: redisClient ? 'connected' : 'unavailable',
    });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/posts', postsRoutes);
  app.use('/api/v1/comments', commentsRoutes);
  // DMs deferred to v1.1
  // app.use('/api/v1/messages', messagesRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/dogs', dogsRoutes);
  app.use('/api/v1/dogs/:dogId/medical', medicalRoutes);
  app.use('/api/v1/medical-shares', medicalShareRouter);
  app.use('/api/v1/parks', parksRoutes);
  app.use('/api/v1/alerts', alertsRoutes);
  app.use('/api/v1/dogs/:dogId/ai', aiAgentRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  async function shutdown() {
    console.log('[Server] Shutting down...');
    await disconnectRedis();
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});

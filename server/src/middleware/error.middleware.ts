import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function errorHandler(
  err: Error & { code?: string; meta?: { target?: string[] } },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Handle Prisma unique constraint violations
  if (err.code === 'P2002') {
    const fields = err.meta?.target?.join(', ') || 'field';
    res.status(409).json({
      error: `A record with that ${fields} already exists`,
    });
    return;
  }

  // Handle Prisma record not found
  if (err.code === 'P2025') {
    res.status(404).json({
      error: 'Record not found',
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

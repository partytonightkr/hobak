import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './utils/errors';
import { ZodError } from 'zod';

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, context: RouteContext) => Promise<NextResponse>;

export function apiHandler(handler: Handler): Handler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: { target?: string[] } };
        if (prismaError.code === 'P2002') {
          const fields = prismaError.meta?.target?.join(', ') || 'field';
          return NextResponse.json(
            { error: `A record with that ${fields} already exists` },
            { status: 409 },
          );
        }
        if (prismaError.code === 'P2025') {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
      }

      console.error('Unhandled error:', error);
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'Internal server error'
              : String(error),
        },
        { status: 500 },
      );
    }
  };
}

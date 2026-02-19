import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, searchParams: URLSearchParams): T {
  const obj = Object.fromEntries(searchParams.entries());
  return validateBody(schema, obj);
}

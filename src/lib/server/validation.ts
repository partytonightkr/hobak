import { z } from 'zod';

export function validateBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T, searchParams: URLSearchParams): z.output<T> {
  const obj = Object.fromEntries(searchParams.entries());
  return validateBody(schema, obj);
}

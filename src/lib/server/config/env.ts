import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/hobak'),
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().default('DEV-ONLY-access-secret-DO-NOT-USE-IN-PROD'),
  JWT_REFRESH_SECRET: isProduction
    ? z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters in production')
    : z.string().default('DEV-ONLY-refresh-secret-DO-NOT-USE-IN-PROD'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5 * 1024 * 1024), // 5MB
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PREMIUM_PRICE_ID: z.string().default('price_premium_monthly'),
  ANTHROPIC_API_KEY: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

function loadEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.warn('Invalid environment variables:', formatted);
    // During build, return defaults instead of crashing
    _env = envSchema.parse({});
    return _env;
  }
  _env = result.data;
  return _env;
}

export const env = loadEnv();

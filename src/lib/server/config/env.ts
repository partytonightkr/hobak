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
  STRIPE_SECRET_KEY: isProduction
    ? z.string().min(1, 'STRIPE_SECRET_KEY is required in production')
    : z.string().default(''),
  STRIPE_WEBHOOK_SECRET: isProduction
    ? z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required in production')
    : z.string().default(''),
  STRIPE_PREMIUM_PRICE_ID: z.string().default('price_premium_monthly'),
  ANTHROPIC_API_KEY: isProduction
    ? z.string().min(1, 'ANTHROPIC_API_KEY is required in production')
    : z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error('Invalid environment variables:', formatted);
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${Object.keys(formatted).join(', ')}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

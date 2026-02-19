import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';

/**
 * Enhanced Helmet configuration with strict security headers.
 * Replaces the basic helmet() call in index.ts.
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some CSS-in-JS
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", env.CORS_ORIGIN],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      ...(env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  // Prevent MIME type sniffing
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // HSTS: 1 year, include subdomains, preload
  hsts:
    env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  // Hide X-Powered-By
  hidePoweredBy: true,
  // Prevent IE from executing downloads in the site's context
  ieNoOpen: true,
  // Don't allow MIME sniffing
  noSniff: true,
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // XSS filter (legacy browsers)
  xssFilter: true,
});

/**
 * Validates that the Origin header matches the configured CORS origin.
 * Provides defense-in-depth for CSRF protection beyond SameSite cookies.
 */
export function validateOrigin(req: Request, res: Response, next: NextFunction): void {
  // Skip origin check for non-mutating methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for Stripe webhooks (they come from Stripe's servers)
  if (req.path.includes('/payments/webhook')) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // If no origin/referer header, allow the request. This covers:
  // - Same-origin requests (browsers sometimes omit Origin on same-origin POSTs)
  // - Server-to-server / API client requests (curl, mobile apps, etc.)
  // These are protected by Bearer token authentication, not origin checks.
  // Origin validation is a defense-in-depth layer for browser-based CSRF only.
  if (!origin && !referer) {
    return next();
  }

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
      }
    } catch {
      // Invalid referer URL
      res.status(403).json({ error: 'Invalid referer' });
      return;
    }
  }

  next();
}

/**
 * Adds additional security headers not covered by Helmet.
 */
export function additionalSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Cross-Origin policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // 'credentialless' allows loading cross-origin resources (Google/GitHub avatars,
  // Stripe.js, Google Fonts) without requiring them to set CORP headers.
  // 'require-corp' would block all external resources that lack CORP headers.
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

  // Permissions Policy (restricts browser features)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );

  next();
}

/**
 * Validates that production environment has required secrets configured.
 * Call this at server startup before listening.
 */
export function validateProductionSecrets(): void {
  if (env.NODE_ENV !== 'production') return;

  const issues: string[] = [];

  if (
    env.JWT_SECRET === 'dev-secret-change-in-production' ||
    env.JWT_SECRET.length < 32
  ) {
    issues.push('JWT_SECRET must be set to a strong secret (min 32 chars) in production');
  }

  if (
    env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-in-production' ||
    env.JWT_REFRESH_SECRET.length < 32
  ) {
    issues.push('JWT_REFRESH_SECRET must be set to a strong secret (min 32 chars) in production');
  }

  if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.length === 0) {
    issues.push('STRIPE_SECRET_KEY must be set in production');
  }

  if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET.length === 0) {
    issues.push('STRIPE_WEBHOOK_SECRET must be set in production');
  }

  if (env.CORS_ORIGIN === 'http://localhost:3000') {
    issues.push('CORS_ORIGIN should not be localhost in production');
  }

  if (issues.length > 0) {
    console.error('[SECURITY] Production configuration errors:');
    issues.forEach((issue) => console.error(`  - ${issue}`));
    process.exit(1);
  }
}

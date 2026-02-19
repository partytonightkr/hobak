import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { getTierFromPriceId } from '../services/stripe.service';

export type SubscriptionTier = 'free' | 'premium';

declare global {
  namespace Express {
    interface Request {
      subscriptionTier?: SubscriptionTier;
    }
  }
}

/**
 * Attaches the user's subscription tier to req.subscriptionTier.
 * Must be used after authenticate middleware.
 */
export async function attachSubscriptionTier(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    req.subscriptionTier = 'free';
    return next();
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
      select: { status: true, stripePriceId: true },
    });

    if (sub && sub.status === 'ACTIVE' && sub.stripePriceId) {
      req.subscriptionTier = getTierFromPriceId(sub.stripePriceId);
    } else {
      req.subscriptionTier = 'free';
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Requires the user to have a premium subscription.
 */
export function requirePremium() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const userTier = req.subscriptionTier || 'free';

    if (userTier !== 'premium') {
      return next(
        new ForbiddenError('This feature requires a Premium subscription'),
      );
    }

    next();
  };
}

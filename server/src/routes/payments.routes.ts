import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { env } from '../config/env';
import * as stripeService from '../services/stripe.service';

const router = Router();

const allowedPriceIds = [env.STRIPE_PREMIUM_PRICE_ID];

const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
});

// POST /payments/create-checkout
// Success/cancel URLs are generated server-side to prevent open redirect attacks.
router.post(
  '/create-checkout',
  authenticate,
  validate(createCheckoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { priceId } = req.body;

      if (!allowedPriceIds.includes(priceId)) {
        res.status(400).json({ error: 'Invalid price ID' });
        return;
      }

      const appUrl = env.CORS_ORIGIN;
      const successUrl = `${appUrl}/settings/subscription?success=true`;
      const cancelUrl = `${appUrl}/pricing?canceled=true`;

      const url = await stripeService.createCheckoutSession(
        req.user!.userId,
        req.user!.email,
        priceId,
        successUrl,
        cancelUrl,
      );
      res.json({ url });
    } catch (error) {
      next(error);
    }
  },
);

// POST /payments/create-portal
router.post(
  '/create-portal',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const returnUrl = `${env.CORS_ORIGIN}/settings/subscription`;
      const url = await stripeService.createBillingPortalSession(req.user!.userId, returnUrl);
      res.json({ url });
    } catch (error) {
      next(error);
    }
  },
);

// POST /payments/webhook
// Stripe requires the raw request body (Buffer) for signature verification.
// express.raw() is applied in the server entry point (index.ts) for this path
// BEFORE express.json(), so req.body arrives as a Buffer here.
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      await stripeService.handleWebhookEvent(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  },
);

// GET /payments/subscription
router.get(
  '/subscription',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await stripeService.getSubscription(req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// POST /payments/cancel
router.post(
  '/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await stripeService.cancelSubscription(req.user!.userId);
      res.json({ message: 'Subscription will be canceled at the end of the billing period' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /payments/resume
router.post(
  '/resume',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await stripeService.resumeSubscription(req.user!.userId);
      res.json({ message: 'Subscription resumed' });
    } catch (error) {
      next(error);
    }
  },
);

// GET /payments/invoices
router.get(
  '/invoices',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoices = await stripeService.getInvoices(req.user!.userId);
      res.json({ invoices });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

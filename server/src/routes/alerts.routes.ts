import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as locationService from '../services/location.service';

const router = Router();

// ──────────────────────────────────────────────
// Validation schemas
// ──────────────────────────────────────────────

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
});

const createAlertSchema = z.object({
  dogId: z.string().min(1),
  lastSeenLatitude: z.number().min(-90).max(90),
  lastSeenLongitude: z.number().min(-180).max(180),
  lastSeenAt: z.coerce.date(),
  description: z.string().min(1).max(5000),
});

const resolveAlertSchema = z.object({
  status: z.enum(['FOUND', 'CANCELLED']),
});

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

// GET /alerts/my — List alerts for the current user's dogs
// NOTE: This route MUST be before /:id to avoid matching "my" as an id
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await locationService.getMyAlerts(req.user!.userId);
    res.json({ data: alerts });
  } catch (error) {
    next(error);
  }
});

// POST /alerts — Create a lost dog alert
router.post(
  '/',
  authenticate,
  validate(createAlertSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await locationService.createLostDogAlert({
        ...req.body,
        userId: req.user!.userId,
      });
      res.status(201).json(alert);
    } catch (error) {
      next(error);
    }
  },
);

// GET /alerts — List active alerts near a location
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radiusKm } = nearbyQuerySchema.parse(req.query);
    const alerts = await locationService.findNearbyAlerts(lat, lng, radiusKm);
    res.json({ data: alerts });
  } catch (error) {
    next(error);
  }
});

// GET /alerts/:id — Get alert details with dog info
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await locationService.getAlertById(req.params.id);
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// PATCH /alerts/:id/resolve — Mark alert as found or cancelled
router.patch(
  '/:id/resolve',
  authenticate,
  validate(resolveAlertSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await locationService.resolveAlert(
        req.params.id,
        req.body.status,
        req.user!.userId,
      );
      res.json(alert);
    } catch (error) {
      next(error);
    }
  },
);

export default router;

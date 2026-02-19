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

const createParkSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
});

const checkInSchema = z.object({
  dogId: z.string().min(1),
});

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

// GET /parks — List parks near a location
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radiusKm } = nearbyQuerySchema.parse(req.query);
    const parks = await locationService.findNearbyParks(lat, lng, radiusKm);
    res.json({ data: parks });
  } catch (error) {
    next(error);
  }
});

// GET /parks/:id — Get park details with active check-ins
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const park = await locationService.getParkWithCheckIns(req.params.id);
    res.json(park);
  } catch (error) {
    next(error);
  }
});

// POST /parks — Submit a new park
router.post(
  '/',
  authenticate,
  validate(createParkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const park = await locationService.createPark({
        ...req.body,
        submittedByUserId: req.user!.userId,
      });
      res.status(201).json(park);
    } catch (error) {
      next(error);
    }
  },
);

// POST /parks/:id/check-in — Check in a dog at a park
router.post(
  '/:id/check-in',
  authenticate,
  validate(checkInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checkIn = await locationService.checkIn(
        req.body.dogId,
        req.params.id,
        req.user!.userId,
      );
      res.status(201).json(checkIn);
    } catch (error) {
      next(error);
    }
  },
);

// POST /parks/:id/check-out — Check out a dog from a park
router.post(
  '/:id/check-out',
  authenticate,
  validate(checkInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checkOut = await locationService.checkOut(
        req.body.dogId,
        req.params.id,
        req.user!.userId,
      );
      res.json(checkOut);
    } catch (error) {
      next(error);
    }
  },
);

// GET /parks/:id/check-ins — List active check-ins at a park
router.get('/:id/check-ins', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkIns = await locationService.getActiveCheckIns(req.params.id);
    res.json({ data: checkIns });
  } catch (error) {
    next(error);
  }
});

export default router;

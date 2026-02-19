import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as medicalService from '../services/medical.service';

// ──────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────

// Date string validator (YYYY-MM-DD or ISO 8601)
const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' },
);

// Vaccination schemas
const createVaccinationSchema = z.object({
  name: z.string().min(1).max(200),
  dateAdministered: dateString,
  nextDueDate: dateString.nullable().optional(),
  vetName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const updateVaccinationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dateAdministered: dateString.optional(),
  nextDueDate: dateString.nullable().optional(),
  vetName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Vet visit schemas
const createVetVisitSchema = z.object({
  date: dateString,
  reason: z.string().min(1).max(500),
  diagnosis: z.string().max(5000).nullable().optional(),
  treatmentNotes: z.string().max(5000).nullable().optional(),
  cost: z.number().min(0).max(999999.99).nullable().optional(),
});

const updateVetVisitSchema = z.object({
  date: dateString.optional(),
  reason: z.string().min(1).max(500).optional(),
  diagnosis: z.string().max(5000).nullable().optional(),
  treatmentNotes: z.string().max(5000).nullable().optional(),
  cost: z.number().min(0).max(999999.99).nullable().optional(),
});

// Medication schemas
const createMedicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(200),
  frequency: z.string().min(1).max(200),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const updateMedicationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().min(1).max(200).optional(),
  frequency: z.string().min(1).max(200).optional(),
  startDate: dateString.optional(),
  endDate: dateString.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Weight log schema
const createWeightLogSchema = z.object({
  weightKg: z.number().min(0.01).max(999.99),
  date: dateString,
});

// Allergy schemas
const createAllergySchema = z.object({
  allergen: z.string().min(1).max(200),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
  notes: z.string().max(2000).nullable().optional(),
});

const updateAllergySchema = z.object({
  allergen: z.string().min(1).max(200).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Share link schema
const createShareLinkSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(7),
});

// ──────────────────────────────────────────────
// Authenticated Medical Routes
// Mounted at /api/v1/dogs/:dogId/medical
// ──────────────────────────────────────────────

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Middleware: verify dog ownership for every request
router.use(async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { dogId } = req.params;
    await medicalService.verifyDogOwnership(dogId, req.user!.userId);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Vaccinations ──────────────────────────────

router.get('/vaccinations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vaccinations = await medicalService.listVaccinations(req.params.dogId);
    res.json({ data: vaccinations });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/vaccinations',
  validate(createVaccinationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vaccination = await medicalService.createVaccination(req.params.dogId, req.body);
      res.status(201).json(vaccination);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/vaccinations/:id',
  validate(updateVaccinationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vaccination = await medicalService.updateVaccination(
        req.params.id,
        req.params.dogId,
        req.body,
      );
      res.json(vaccination);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/vaccinations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.deleteVaccination(req.params.id, req.params.dogId);
    res.json({ message: 'Vaccination record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Vet Visits ────────────────────────────────

router.get('/vet-visits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vetVisits = await medicalService.listVetVisits(req.params.dogId);
    res.json({ data: vetVisits });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/vet-visits',
  validate(createVetVisitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vetVisit = await medicalService.createVetVisit(req.params.dogId, req.body);
      res.status(201).json(vetVisit);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/vet-visits/:id',
  validate(updateVetVisitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vetVisit = await medicalService.updateVetVisit(
        req.params.id,
        req.params.dogId,
        req.body,
      );
      res.json(vetVisit);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/vet-visits/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.deleteVetVisit(req.params.id, req.params.dogId);
    res.json({ message: 'Vet visit record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Medications ───────────────────────────────

router.get('/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medications = await medicalService.listMedications(req.params.dogId);
    res.json({ data: medications });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/medications',
  validate(createMedicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medication = await medicalService.createMedication(req.params.dogId, req.body);
      res.status(201).json(medication);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/medications/:id',
  validate(updateMedicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medication = await medicalService.updateMedication(
        req.params.id,
        req.params.dogId,
        req.body,
      );
      res.json(medication);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/medications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.deleteMedication(req.params.id, req.params.dogId);
    res.json({ message: 'Medication record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Weight Log ────────────────────────────────

router.get('/weight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weightLogs = await medicalService.listWeightLogs(req.params.dogId);
    res.json({ data: weightLogs });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/weight',
  validate(createWeightLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const weightLog = await medicalService.createWeightLog(req.params.dogId, req.body);
      res.status(201).json(weightLog);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/weight/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.deleteWeightLog(req.params.id, req.params.dogId);
    res.json({ message: 'Weight log entry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Allergies ─────────────────────────────────

router.get('/allergies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allergies = await medicalService.listAllergies(req.params.dogId);
    res.json({ data: allergies });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/allergies',
  validate(createAllergySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allergy = await medicalService.createAllergy(req.params.dogId, req.body);
      res.status(201).json(allergy);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/allergies/:id',
  validate(updateAllergySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allergy = await medicalService.updateAllergy(
        req.params.id,
        req.params.dogId,
        req.body,
      );
      res.json(allergy);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/allergies/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.deleteAllergy(req.params.id, req.params.dogId);
    res.json({ message: 'Allergy record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Medical Summary ───────────────────────────

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await medicalService.getMedicalSummary(req.params.dogId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// ── Share Links ───────────────────────────────

router.post(
  '/share',
  validate(createShareLinkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { expiresInDays } = req.body;
      const shareLink = await medicalService.createShareLink(req.params.dogId, expiresInDays);

      // Build the shareable URL from request origin
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:4000';
      const url = `${protocol}://${host}/api/v1/medical-shares/${shareLink.token}`;

      res.status(201).json({
        token: shareLink.token,
        url,
        expiresAt: shareLink.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/shares', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shares = await medicalService.listShareLinks(req.params.dogId);
    res.json({ data: shares });
  } catch (error) {
    next(error);
  }
});

router.delete('/shares/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await medicalService.revokeShareLink(req.params.id, req.params.dogId);
    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// Public Share Route (NO auth required)
// Mounted at /api/v1/medical-shares
// ──────────────────────────────────────────────

export const medicalShareRouter = Router();

medicalShareRouter.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await medicalService.getSharedMedicalData(req.params.token);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

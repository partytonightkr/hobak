import { prisma } from '../config/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { Prisma } from '@prisma/client';

// ──────────────────────────────────────────────
// Ownership Verification
// ──────────────────────────────────────────────

/**
 * Verify that the requesting user owns the given dog.
 * Throws ForbiddenError if ownership check fails, NotFoundError if dog doesn't exist.
 */
export async function verifyDogOwnership(dogId: string, userId: string): Promise<void> {
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: { ownerId: true, deletedAt: true },
  });

  if (!dog || dog.deletedAt) {
    throw new NotFoundError('Dog');
  }

  if (dog.ownerId !== userId) {
    throw new ForbiddenError('You do not own this dog');
  }
}

// ──────────────────────────────────────────────
// Vaccinations
// ──────────────────────────────────────────────

export interface CreateVaccinationInput {
  name: string;
  dateAdministered: string;
  nextDueDate?: string | null;
  vetName?: string | null;
  notes?: string | null;
}

export async function listVaccinations(dogId: string) {
  return prisma.vaccination.findMany({
    where: { dogId },
    orderBy: { dateAdministered: 'desc' },
  });
}

export async function createVaccination(dogId: string, data: CreateVaccinationInput) {
  return prisma.vaccination.create({
    data: {
      dogId,
      name: data.name,
      dateAdministered: new Date(data.dateAdministered),
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      vetName: data.vetName ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function updateVaccination(id: string, dogId: string, data: Partial<CreateVaccinationInput>) {
  const record = await prisma.vaccination.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Vaccination record');
  }

  return prisma.vaccination.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.dateAdministered !== undefined && { dateAdministered: new Date(data.dateAdministered) }),
      ...(data.nextDueDate !== undefined && { nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null }),
      ...(data.vetName !== undefined && { vetName: data.vetName }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteVaccination(id: string, dogId: string) {
  const record = await prisma.vaccination.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Vaccination record');
  }

  await prisma.vaccination.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Vet Visits
// ──────────────────────────────────────────────

export interface CreateVetVisitInput {
  date: string;
  reason: string;
  diagnosis?: string | null;
  treatmentNotes?: string | null;
  cost?: number | string | null;
}

export async function listVetVisits(dogId: string) {
  return prisma.vetVisit.findMany({
    where: { dogId },
    orderBy: { date: 'desc' },
  });
}

export async function createVetVisit(dogId: string, data: CreateVetVisitInput) {
  return prisma.vetVisit.create({
    data: {
      dogId,
      date: new Date(data.date),
      reason: data.reason,
      diagnosis: data.diagnosis ?? null,
      treatmentNotes: data.treatmentNotes ?? null,
      cost: data.cost != null ? new Prisma.Decimal(data.cost.toString()) : null,
    },
  });
}

export async function updateVetVisit(id: string, dogId: string, data: Partial<CreateVetVisitInput>) {
  const record = await prisma.vetVisit.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Vet visit record');
  }

  return prisma.vetVisit.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.reason !== undefined && { reason: data.reason }),
      ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
      ...(data.treatmentNotes !== undefined && { treatmentNotes: data.treatmentNotes }),
      ...(data.cost !== undefined && {
        cost: data.cost != null ? new Prisma.Decimal(data.cost.toString()) : null,
      }),
    },
  });
}

export async function deleteVetVisit(id: string, dogId: string) {
  const record = await prisma.vetVisit.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Vet visit record');
  }

  await prisma.vetVisit.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Medications
// ──────────────────────────────────────────────

export interface CreateMedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export async function listMedications(dogId: string) {
  return prisma.medication.findMany({
    where: { dogId },
    orderBy: { startDate: 'desc' },
  });
}

export async function createMedication(dogId: string, data: CreateMedicationInput) {
  return prisma.medication.create({
    data: {
      dogId,
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes ?? null,
    },
  });
}

export async function updateMedication(id: string, dogId: string, data: Partial<CreateMedicationInput>) {
  const record = await prisma.medication.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Medication record');
  }

  return prisma.medication.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.dosage !== undefined && { dosage: data.dosage }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteMedication(id: string, dogId: string) {
  const record = await prisma.medication.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Medication record');
  }

  await prisma.medication.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Weight Log
// ──────────────────────────────────────────────

export interface CreateWeightLogInput {
  weightKg: number | string;
  date: string;
}

export async function listWeightLogs(dogId: string) {
  return prisma.weightLog.findMany({
    where: { dogId },
    orderBy: { date: 'desc' },
  });
}

export async function createWeightLog(dogId: string, data: CreateWeightLogInput) {
  return prisma.weightLog.create({
    data: {
      dogId,
      weightKg: new Prisma.Decimal(data.weightKg.toString()),
      date: new Date(data.date),
    },
  });
}

export async function deleteWeightLog(id: string, dogId: string) {
  const record = await prisma.weightLog.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Weight log entry');
  }

  await prisma.weightLog.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Allergies
// ──────────────────────────────────────────────

export interface CreateAllergyInput {
  allergen: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  notes?: string | null;
}

export async function listAllergies(dogId: string) {
  return prisma.allergy.findMany({
    where: { dogId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAllergy(dogId: string, data: CreateAllergyInput) {
  return prisma.allergy.create({
    data: {
      dogId,
      allergen: data.allergen,
      severity: data.severity,
      notes: data.notes ?? null,
    },
  });
}

export async function updateAllergy(id: string, dogId: string, data: Partial<CreateAllergyInput>) {
  const record = await prisma.allergy.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Allergy record');
  }

  return prisma.allergy.update({
    where: { id },
    data: {
      ...(data.allergen !== undefined && { allergen: data.allergen }),
      ...(data.severity !== undefined && { severity: data.severity }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteAllergy(id: string, dogId: string) {
  const record = await prisma.allergy.findUnique({ where: { id } });
  if (!record || record.dogId !== dogId) {
    throw new NotFoundError('Allergy record');
  }

  await prisma.allergy.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Medical Summary
// ──────────────────────────────────────────────

export async function getMedicalSummary(dogId: string) {
  const now = new Date();

  const [vaccinations, activeMedications, recentVetVisits, latestWeight, allergies] =
    await Promise.all([
      // Vaccinations with upcoming due dates (all vaccinations, highlighting upcoming)
      prisma.vaccination.findMany({
        where: { dogId },
        orderBy: { dateAdministered: 'desc' },
      }),

      // Active medications: no end date, or end date in the future
      prisma.medication.findMany({
        where: {
          dogId,
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
        orderBy: { startDate: 'desc' },
      }),

      // Recent vet visits (last 5)
      prisma.vetVisit.findMany({
        where: { dogId },
        orderBy: { date: 'desc' },
        take: 5,
      }),

      // Latest weight entry
      prisma.weightLog.findFirst({
        where: { dogId },
        orderBy: { date: 'desc' },
      }),

      // All allergies
      prisma.allergy.findMany({
        where: { dogId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  // Separate upcoming vaccinations (due date in the future or today)
  const upcomingVaccinations = vaccinations.filter(
    (v) => v.nextDueDate && v.nextDueDate >= now,
  );

  return {
    vaccinations,
    upcomingVaccinations,
    activeMedications,
    recentVetVisits,
    currentWeight: latestWeight,
    allergies,
  };
}

// ──────────────────────────────────────────────
// Medical Share Links
// ──────────────────────────────────────────────

export async function createShareLink(dogId: string, expiresInDays: number = 7) {
  if (expiresInDays < 1 || expiresInDays > 365) {
    throw new ValidationError('expiresInDays must be between 1 and 365');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const shareLink = await prisma.medicalShareLink.create({
    data: {
      dogId,
      expiresAt,
      // token is auto-generated by Prisma @default(uuid())
    },
  });

  return {
    id: shareLink.id,
    token: shareLink.token,
    expiresAt: shareLink.expiresAt,
  };
}

export async function listShareLinks(dogId: string) {
  return prisma.medicalShareLink.findMany({
    where: { dogId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
    },
  });
}

export async function revokeShareLink(id: string, dogId: string) {
  const link = await prisma.medicalShareLink.findUnique({ where: { id } });
  if (!link || link.dogId !== dogId) {
    throw new NotFoundError('Share link');
  }

  return prisma.medicalShareLink.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

/**
 * Public endpoint: validate share token and return vaccination data.
 * Per PRD, shared links expose vaccination records only.
 */
export async function getSharedMedicalData(token: string) {
  const shareLink = await prisma.medicalShareLink.findUnique({
    where: { token },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          breed: true,
          dateOfBirth: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!shareLink) {
    throw new NotFoundError('Share link');
  }

  if (shareLink.revokedAt) {
    throw new ForbiddenError('This share link has been revoked');
  }

  if (shareLink.expiresAt < new Date()) {
    throw new ForbiddenError('This share link has expired');
  }

  // Return vaccination records only (as specified in PRD)
  const vaccinations = await prisma.vaccination.findMany({
    where: { dogId: shareLink.dogId },
    orderBy: { dateAdministered: 'desc' },
  });

  return {
    dog: shareLink.dog,
    vaccinations,
    sharedAt: shareLink.createdAt,
    expiresAt: shareLink.expiresAt,
  };
}

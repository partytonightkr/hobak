import { prisma } from '../db';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

// ──────────────────────────────────────────────
// Haversine distance
// ──────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance in km between two lat/lng points using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// ──────────────────────────────────────────────
// Dog Parks
// ──────────────────────────────────────────────

/** Check-in auto-expiry duration in hours. */
const CHECK_IN_EXPIRY_HOURS = 3;

export interface NearbyPark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  verified: boolean;
  distance: number; // km
}

/**
 * Find parks within a radius (km) of a given lat/lng.
 * Returns parks sorted by distance ascending.
 */
export async function findNearbyParks(
  lat: number,
  lng: number,
  radiusKm: number = 10,
): Promise<NearbyPark[]> {
  const parks = await prisma.dogPark.findMany({
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      address: true,
      verified: true,
    },
  });

  const nearby: NearbyPark[] = [];

  for (const park of parks) {
    const distance = haversineDistance(lat, lng, park.latitude, park.longitude);
    if (distance <= radiusKm) {
      nearby.push({ ...park, distance: Math.round(distance * 100) / 100 });
    }
  }

  nearby.sort((a, b) => a.distance - b.distance);
  return nearby;
}

/**
 * Get a single park by ID with its active (non-expired) check-ins.
 */
export async function getParkWithCheckIns(parkId: string) {
  const park = await prisma.dogPark.findUnique({
    where: { id: parkId },
    include: {
      checkIns: {
        where: {
          checkedOutAt: null,
          checkedInAt: {
            gte: new Date(Date.now() - CHECK_IN_EXPIRY_HOURS * 60 * 60 * 1000),
          },
        },
        include: {
          dog: {
            select: {
              id: true,
              name: true,
              username: true,
              breed: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
      },
      submittedByUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (!park) throw new NotFoundError('Dog park');
  return park;
}

/**
 * Submit a new dog park. Unverified by default.
 */
export async function createPark(data: {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  submittedByUserId: string;
}) {
  return prisma.dogPark.create({
    data: {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      submittedByUserId: data.submittedByUserId,
      verified: false,
    },
  });
}

/**
 * Check in a dog at a park. The dog must belong to the current user.
 * A dog can only have one active check-in at a time.
 * Check-ins auto-expire after CHECK_IN_EXPIRY_HOURS.
 */
export async function checkIn(dogId: string, parkId: string, userId: string) {
  // Verify the park exists
  const park = await prisma.dogPark.findUnique({ where: { id: parkId } });
  if (!park) throw new NotFoundError('Dog park');

  // Verify the dog exists and belongs to the user
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: { id: true, ownerId: true, name: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  if (dog.ownerId !== userId) throw new ForbiddenError('You can only check in your own dogs');

  // Check for existing active check-in (not expired and not checked out)
  const expiryThreshold = new Date(Date.now() - CHECK_IN_EXPIRY_HOURS * 60 * 60 * 1000);
  const existingCheckIn = await prisma.parkCheckIn.findFirst({
    where: {
      dogId,
      checkedOutAt: null,
      checkedInAt: { gte: expiryThreshold },
    },
  });

  if (existingCheckIn) {
    throw new ConflictError(`${dog.name} is already checked in at a park`);
  }

  return prisma.parkCheckIn.create({
    data: {
      dogId,
      parkId,
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          avatarUrl: true,
        },
      },
      park: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Check out a dog from a park. The dog must belong to the current user.
 */
export async function checkOut(dogId: string, parkId: string, userId: string) {
  // Verify the dog belongs to the user
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: { id: true, ownerId: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  if (dog.ownerId !== userId) throw new ForbiddenError('You can only check out your own dogs');

  // Find the active check-in
  const expiryThreshold = new Date(Date.now() - CHECK_IN_EXPIRY_HOURS * 60 * 60 * 1000);
  const checkInRecord = await prisma.parkCheckIn.findFirst({
    where: {
      dogId,
      parkId,
      checkedOutAt: null,
      checkedInAt: { gte: expiryThreshold },
    },
  });

  if (!checkInRecord) {
    throw new NotFoundError('Active check-in');
  }

  return prisma.parkCheckIn.update({
    where: { id: checkInRecord.id },
    data: { checkedOutAt: new Date() },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      park: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get all active (non-expired, non-checked-out) check-ins at a park.
 */
export async function getActiveCheckIns(parkId: string) {
  const park = await prisma.dogPark.findUnique({ where: { id: parkId } });
  if (!park) throw new NotFoundError('Dog park');

  const expiryThreshold = new Date(Date.now() - CHECK_IN_EXPIRY_HOURS * 60 * 60 * 1000);

  return prisma.parkCheckIn.findMany({
    where: {
      parkId,
      checkedOutAt: null,
      checkedInAt: { gte: expiryThreshold },
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          size: true,
          avatarUrl: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { checkedInAt: 'desc' },
  });
}

// ──────────────────────────────────────────────
// Lost Dog Alerts
// ──────────────────────────────────────────────

export interface CreateAlertInput {
  dogId: string;
  lastSeenLatitude: number;
  lastSeenLongitude: number;
  lastSeenAt: Date;
  description: string;
  userId: string;
}

/**
 * Create a lost dog alert. Only the dog's owner can create one.
 * There can only be one active alert per dog.
 */
export async function createLostDogAlert(data: CreateAlertInput) {
  // Verify the dog exists and belongs to the user
  const dog = await prisma.dog.findUnique({
    where: { id: data.dogId },
    select: { id: true, ownerId: true, name: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  if (dog.ownerId !== data.userId) {
    throw new ForbiddenError('Only the dog\'s owner can create a lost dog alert');
  }

  // Check for existing active alert for this dog
  const existingAlert = await prisma.lostDogAlert.findFirst({
    where: {
      dogId: data.dogId,
      status: 'ACTIVE',
    },
  });

  if (existingAlert) {
    throw new ConflictError(`There is already an active alert for ${dog.name}`);
  }

  return prisma.lostDogAlert.create({
    data: {
      dogId: data.dogId,
      lastSeenLatitude: data.lastSeenLatitude,
      lastSeenLongitude: data.lastSeenLongitude,
      lastSeenAt: data.lastSeenAt,
      description: data.description,
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          avatarUrl: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Find active lost dog alerts within a radius (km) of a given lat/lng.
 * Returns alerts sorted by recency (most recent first).
 */
export async function findNearbyAlerts(
  lat: number,
  lng: number,
  radiusKm: number = 10,
) {
  const alerts = await prisma.lostDogAlert.findMany({
    where: { status: 'ACTIVE' },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          size: true,
          avatarUrl: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by distance
  type AlertWithDog = (typeof alerts)[number];
  return alerts
    .map((alert: AlertWithDog) => {
      const distance = haversineDistance(
        lat,
        lng,
        alert.lastSeenLatitude,
        alert.lastSeenLongitude,
      );
      return { ...alert, distance: Math.round(distance * 100) / 100 };
    })
    .filter((alert: AlertWithDog & { distance: number }) => alert.distance <= radiusKm);
}

/**
 * Get a single lost dog alert by ID.
 */
export async function getAlertById(alertId: string) {
  const alert = await prisma.lostDogAlert.findUnique({
    where: { id: alertId },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          size: true,
          avatarUrl: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!alert) throw new NotFoundError('Lost dog alert');
  return alert;
}

/**
 * Resolve a lost dog alert (mark as FOUND or CANCELLED).
 * Only the dog's owner can resolve it.
 */
export async function resolveAlert(
  alertId: string,
  status: 'FOUND' | 'CANCELLED',
  userId: string,
) {
  const alert = await prisma.lostDogAlert.findUnique({
    where: { id: alertId },
    include: {
      dog: {
        select: { ownerId: true },
      },
    },
  });

  if (!alert) throw new NotFoundError('Lost dog alert');
  if (alert.dog.ownerId !== userId) {
    throw new ForbiddenError('Only the dog\'s owner can resolve this alert');
  }
  if (alert.status !== 'ACTIVE') {
    throw new ConflictError('This alert has already been resolved');
  }

  return prisma.lostDogAlert.update({
    where: { id: alertId },
    data: {
      status,
      resolvedAt: new Date(),
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          avatarUrl: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get all alerts for dogs owned by a specific user.
 */
export async function getMyAlerts(userId: string) {
  return prisma.lostDogAlert.findMany({
    where: {
      dog: {
        ownerId: userId,
      },
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          username: true,
          breed: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

import { prisma } from '../config/prisma';
import type { ReportReason, ReportStatus, ModerationAction } from '@prisma/client';

// Automated content filtering (spam/NSFW ML) is deferred to v1.1.
// MVP uses manual review via user reports + admin actions.

// ---------------------------------------------------------------------------
// v1.1 FEATURE - Automated content filtering
// Not called in MVP routes; will be integrated when ML-based filtering ships.
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS = [
  /\b(?:buy\s+followers|free\s+followers|click\s+(?:here|this\s+link))\b/i,
  /(?:https?:\/\/)?(?:bit\.ly|tinyurl\.com|t\.co)\/\S+/i, // shortened URLs (spam signal)
];

const FLAGGED_PATTERNS = [
  /\b(?:kill\s+(?:yourself|urself)|kys)\b/i,
  /\b(?:n[i1]gg[ae3]r|f[a@]gg?[o0]t|r[e3]t[a@]rd)\b/i,
];

interface ContentCheckResult {
  allowed: boolean;
  flagged: boolean;
  reasons: string[];
}

/**
 * Automated content check using pattern matching.
 * In v1.1 this will be replaced / augmented by an ML classifier.
 *
 * Returns:
 *   allowed: false  -> content should be blocked outright
 *   flagged: true   -> content is published but queued for human review
 *   allowed: true, flagged: false -> content is clean
 */
export function checkContent(text: string): ContentCheckResult {
  const reasons: string[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`Blocked pattern: ${pattern.source}`);
    }
  }

  if (reasons.length > 0) {
    return { allowed: false, flagged: true, reasons };
  }

  for (const pattern of FLAGGED_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`Flagged pattern: ${pattern.source}`);
    }
  }

  if (reasons.length > 0) {
    return { allowed: true, flagged: true, reasons };
  }

  return { allowed: true, flagged: false, reasons: [] };
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Image safety scanning (CSAM / NSFW)
// Placeholder interface - swap in real provider (e.g. PhotoDNA, AWS Rekognition)
// before launch. See PRD for legal requirements.
// ---------------------------------------------------------------------------

export interface ImageScanResult {
  safe: boolean;
  category?: string;
  confidence?: number;
}

/**
 * Scan an uploaded image for CSAM / NSFW content.
 * Currently returns a placeholder "safe" result.
 * Replace with actual scanning provider before production launch.
 */
export async function scanImage(_filePath: string): Promise<ImageScanResult> {
  // TODO: Integrate real CSAM scanning provider (PhotoDNA, AWS Rekognition, etc.)
  return { safe: true };
}

// ---------------------------------------------------------------------------

/**
 * Create a report for content or user.
 */
export async function createReport(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: ReportReason;
  description?: string;
}) {
  // Find the reported user based on target type
  let reportedUserId: string | null = null;

  if (input.targetType === 'user') {
    reportedUserId = input.targetId;
  } else if (input.targetType === 'post') {
    const post = await prisma.post.findUnique({
      where: { id: input.targetId },
      select: { authorId: true },
    });
    reportedUserId = post?.authorId ?? null;
  } else if (input.targetType === 'comment') {
    const comment = await prisma.comment.findUnique({
      where: { id: input.targetId },
      select: { authorId: true },
    });
    reportedUserId = comment?.authorId ?? null;
  }

  return prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reportedUserId,
      reason: input.reason,
      description: input.description,
    },
  });
}

/**
 * Get pending reports for admin review.
 */
export async function getPendingReports(limit = 20, offset = 0) {
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { status: 'PENDING' },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
        reportedUser: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.report.count({ where: { status: 'PENDING' } }),
  ]);

  return { reports, total };
}

/**
 * Resolve a report with a moderation decision.
 */
export async function resolveReport(
  reportId: string,
  moderatorId: string,
  status: ReportStatus,
) {
  return prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      moderatorId,
      resolvedAt: new Date(),
    },
  });
}

/**
 * Take a moderation action on a user.
 */
export async function takeAction(input: {
  targetId: string;
  moderatorId: string;
  action: ModerationAction;
  reason?: string;
  expiresAt?: Date;
}) {
  const log = await prisma.moderationLog.create({
    data: {
      targetId: input.targetId,
      moderatorId: input.moderatorId,
      action: input.action,
      reason: input.reason,
      expiresAt: input.expiresAt,
    },
  });

  // Apply the action
  switch (input.action) {
    case 'BAN':
    case 'SUSPEND':
      await prisma.user.update({
        where: { id: input.targetId },
        data: { deletedAt: new Date() },
      });
      break;
    case 'CONTENT_REMOVE':
      // Remove all posts by the user that are flagged
      // In practice, you'd target specific content
      break;
    case 'CONTENT_HIDE':
      // Hide specific content - would need targetType/targetId for content
      break;
  }

  return log;
}

/**
 * Get moderation history for a user.
 */
export async function getModerationHistory(userId: string) {
  return prisma.moderationLog.findMany({
    where: { targetId: userId },
    include: {
      moderator: {
        select: { id: true, username: true, displayName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get overall moderation stats for the admin dashboard.
 */
export async function getModerationStats() {
  const [pendingReports, resolvedToday, totalActions] = await Promise.all([
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.report.count({
      where: {
        status: { in: ['RESOLVED', 'DISMISSED'] },
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.moderationLog.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return {
    pendingReports,
    resolvedToday,
    totalActionsToday: totalActions,
  };
}

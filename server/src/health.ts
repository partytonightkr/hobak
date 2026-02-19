import { Router, Request, Response } from "express";
import { prisma } from "./config/prisma";
import { getRedisClient } from "./config/redis";

const router = Router();

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
  };
}

interface CheckResult {
  status: "ok" | "down";
  latency?: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { status: "ok", latency };
  } catch (err) {
    return {
      status: "down",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) {
    return { status: "down", error: "Redis client not connected" };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    return { status: "ok", latency };
  } catch (err) {
    return {
      status: "down",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

router.get("/health", async (_req: Request, res: Response) => {
  const [database, redis] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
  ]);

  const dbResult: CheckResult =
    database.status === "fulfilled"
      ? database.value
      : { status: "down", error: "Check failed" };
  const redisResult: CheckResult =
    redis.status === "fulfilled"
      ? redis.value
      : { status: "down", error: "Check failed" };

  const allOk = dbResult.status === "ok" && redisResult.status === "ok";
  const allDown = dbResult.status === "down" && redisResult.status === "down";

  const overallStatus = allOk ? "ok" : allDown ? "down" : "degraded";

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.1.0",
    checks: {
      database: dbResult,
      redis: redisResult,
    },
  };

  const statusCode = overallStatus === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Simple liveness probe for container orchestrators
router.get("/health/live", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe - checks dependencies
router.get("/health/ready", async (_req: Request, res: Response) => {
  const [database, redis] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
  ]);

  const dbOk =
    database.status === "fulfilled" && database.value.status === "ok";
  const redisOk =
    redis.status === "fulfilled" && redis.value.status === "ok";

  if (dbOk && redisOk) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not_ready" });
  }
});

export default router;

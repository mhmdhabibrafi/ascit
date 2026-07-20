/**
 * Health Check dan System Monitoring
 * Endpoint untuk monitoring status sistem
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckItem;
    cache: HealthCheckItem;
    api: HealthCheckItem;
  };
  metrics?: {
    cacheStats: any;
    requestCount?: number;
    errorCount?: number;
    averageResponseTime?: number;
  };
}

export interface HealthCheckItem {
  status: "ok" | "error" | "degraded";
  message: string;
  responseTime: number;
  timestamp: string;
}

class HealthCheckService {
  private startTime = Date.now();

  async checkDatabase(): Promise<HealthCheckItem> {
    const start = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        message: "Database connection healthy",
        responseTime: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Database health check failed", error as Error, { module: "HealthCheck" });
      return {
        status: "error",
        message: `Database error: ${(error as Error).message}`,
        responseTime: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  checkCache(): HealthCheckItem {
    const start = performance.now();
    try {
      const stats = cache.getStats();
      const message =
        stats.size > 0 ? `Cache healthy - ${stats.size} entries, ${stats.hitRate} hit rate` : "Cache empty";

      return {
        status: "ok",
        message,
        responseTime: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        message: `Cache error: ${(error as Error).message}`,
        responseTime: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  checkApi(): HealthCheckItem {
    const start = performance.now();
    // API always responds
    return {
      status: "ok",
      message: "API responding normally",
      responseTime: performance.now() - start,
      timestamp: new Date().toISOString(),
    };
  }

  getStatus(checks: HealthCheckResponse["checks"]): "healthy" | "degraded" | "unhealthy" {
    const statuses = Object.values(checks).map((c) => c.status);

    if (statuses.includes("error")) return "unhealthy";
    if (statuses.includes("degraded")) return "degraded";
    return "healthy";
  }

  async performHealthCheck(): Promise<HealthCheckResponse> {
    const [dbCheck, cacheCheck, apiCheck] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkCache()),
      Promise.resolve(this.checkApi()),
    ]);

    const checks = {
      database: dbCheck,
      cache: cacheCheck,
      api: apiCheck,
    };

    const status = this.getStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: "1.0.0",
      checks,
      metrics: {
        cacheStats: cache.getStats(),
      },
    };
  }
}

export const healthCheckService = new HealthCheckService();

/**
 * API Route: GET /api/health
 */
export async function GET() {
  try {
    const health = await healthCheckService.performHealthCheck();

    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 202 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error("Health check failed", error as Error, { module: "HealthCheck" });
    return NextResponse.json(
      {
        status: "unhealthy",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

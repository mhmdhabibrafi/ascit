import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DatabaseInfo = {
  databaseName: string;
  schemaName: string;
  serverTime: Date;
};

export async function GET(request: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const summaryOnly = request.nextUrl.searchParams.get("summary") === "1";
    const [databaseInfo] = await prisma.$queryRaw<DatabaseInfo[]>`
      SELECT
        current_database() AS "databaseName",
        current_schema() AS "schemaName",
        now() AS "serverTime"
    `;

    if (summaryOnly) {
      return NextResponse.json({
        status: "ok",
        provider: "PostgreSQL",
        database: {
          name: databaseInfo?.databaseName ?? "unknown",
          schema: databaseInfo?.schemaName ?? "public",
          serverTime: databaseInfo?.serverTime ?? new Date()
        }
      });
    }

    const [assets, users, units, auditLogs] = await Promise.all([
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.unit.count(),
      prisma.auditLog.count()
    ]);

    return NextResponse.json({
      status: "ok",
      provider: "PostgreSQL",
      database: {
        name: databaseInfo?.databaseName ?? "unknown",
        schema: databaseInfo?.schemaName ?? "public",
        serverTime: databaseInfo?.serverTime ?? new Date()
      },
      counts: {
        assets,
        users,
        units,
        auditLogs
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        provider: "PostgreSQL",
        message: error instanceof Error ? error.message : "Database belum dapat diakses."
      },
      { status: 503 }
    );
  }
}

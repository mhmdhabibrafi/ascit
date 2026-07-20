import { execFile } from "child_process";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, hasAnyRole } from "@/lib/api";
import { settingsAdminRoles } from "@/lib/system-settings";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, [...settingsAdminRoles])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const dateStr = new Date().toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-");
  
  if (format === "sql") {
    try {
      const connUrl = process.env.DATABASE_URL;
      if (!connUrl) {
        throw new Error("DATABASE_URL tidak terdefinisi di environment.");
      }

      const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
      const { stdout, stderr } = await execFileAsync(pgDumpPath, [
        `--dbname=${connUrl}`,
        "-F", "p", "--clean", "--if-exists", "--inserts"
      ], {
        maxBuffer: 64 * 1024 * 1024 // 64 MB max buffer
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      return new NextResponse(stdout, {
        status: 200,
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="ascit_backup_${dateStr}.sql"`,
          "Cache-Control": "no-store"
        }
      });
    } catch (error) {
      console.error("SQL Backup failed, falling back to JSON:", error);
      // If SQL fails, we return a 400 JSON error so the client knows it failed, 
      // but they can download the portable JSON backup instead.
      return NextResponse.json({ 
        error: "Gagal membuat backup SQL. Pastikan pg_dump terinstal dan dapat diakses.",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  }

  // Fallback / default: JSON portable format
  try {
    const data = {
      backupMetadata: {
        exportedAt: new Date(),
        version: "1.0.0",
        system: "ASCIT"
      },
      roles: await prisma.role.findMany(),
      users: await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      units: await prisma.unit.findMany(),
      rooms: await prisma.room.findMany(),
      brands: await prisma.brand.findMany(),
      vendors: await prisma.vendor.findMany(),
      technicians: await prisma.technician.findMany(),
      assets: await prisma.asset.findMany(),
      serviceRecords: await prisma.serviceRecord.findMany(),
      mutations: await prisma.assetMutation.findMany(),
      auditLogs: await prisma.auditLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
      systemSettings: await prisma.systemSetting.findMany()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ascit_backup_${dateStr}.json"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: "Gagal mengekspor data JSON.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST() {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, [...settingsAdminRoles])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "security" } });
    let retentionDays = 365;
    if (row && row.value && typeof row.value === "object") {
      const val = row.value as any;
      if (val.auditRetentionDays) retentionDays = Number(val.auditRetentionDays);
    }

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PRUNE_AUDIT_LOG",
        module: "Pengaturan Sistem",
        description: `${deleted.count} log audit berumur lebih dari ${retentionDays} hari dibersihkan.`
      }
    });

    return NextResponse.json({
      success: true,
      message: `Pemeliharaan sukses. Sebanyak ${deleted.count} baris log audit yang berumur lebih dari ${retentionDays} hari telah dibersihkan.`,
      prunedCount: deleted.count,
      retentionDays
    });
  } catch (error) {
    return NextResponse.json({
      error: "Gagal melakukan pemeliharaan database.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


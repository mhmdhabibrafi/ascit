import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { forbidden, hasAnyRole, requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  normalizeSystemSettings,
  settingDefinitions,
  settingsAdminRoles,
  type SystemSettings
} from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const [initialSettingRows, recentAudit] = await Promise.all([
    prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.auditLog.findMany({
      where: { module: "Pengaturan" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);
  let settingRows = initialSettingRows;

  const existingKeys = new Set(settingRows.map((row) => row.key));
  const missingDefinitions = settingDefinitions.filter((definition) => !existingKeys.has(definition.key));
  if (missingDefinitions.length) {
    await prisma.systemSetting.createMany({
      data: missingDefinitions.map((definition) => ({
        key: definition.key,
        value: definition.defaultValue as Prisma.InputJsonValue,
        description: definition.description
      })),
      skipDuplicates: true
    });
    settingRows = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  }

  const settings = normalizeSystemSettings(
    Object.fromEntries(settingRows.map((row) => [row.key, row.value])) as Partial<SystemSettings>
  );

  return NextResponse.json({
    settings,
    runtime: buildRuntimeInfo(settings),
    capabilities: {
      canEdit: hasAnyRole(session.user.role, settings.security.allowedAdminRoles)
    },
    recentAudit: recentAudit.map((row) => ({
      id: row.id,
      action: row.action,
      description: row.description,
      createdAt: row.createdAt,
      user: row.user?.name || row.user?.email || "Sistem"
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const [settingRow] = await prisma.systemSetting.findMany({ where: { key: "security" } });
  const securitySettings = settingRow ? (settingRow.value as any) : { allowedAdminRoles: settingsAdminRoles };
  const allowedRoles = securitySettings?.allowedAdminRoles || settingsAdminRoles;
  if (!hasAnyRole(session.user.role, allowedRoles)) return forbidden();

  try {
    const body = await request.json();
    const settings = normalizeSystemSettings(body.settings || body);

    await prisma.$transaction(
      settingDefinitions.map((definition) =>
        prisma.systemSetting.upsert({
          where: { key: definition.key },
          update: {
            value: settings[definition.key] as Prisma.InputJsonValue,
            description: definition.description
          },
          create: {
            key: definition.key,
            value: settings[definition.key] as Prisma.InputJsonValue,
            description: definition.description
          }
        })
      )
    );

    await createAuditLog({
      session,
      action: "UPDATE_SETTINGS",
      module: "Pengaturan",
      description: "Konfigurasi sistem ASCIT diperbarui.",
      ipAddress: requestIp(request)
    });

    return NextResponse.json({
      settings,
      runtime: buildRuntimeInfo(settings),
      savedAt: new Date()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan." },
      { status: 400 }
    );
  }
}

function buildRuntimeInfo(settings: SystemSettings) {
  const envChecks = [
    envCheck({
      key: "DATABASE_URL",
      label: "Koneksi PostgreSQL",
      category: "Database",
      required: true,
      secret: true,
      value: process.env.DATABASE_URL,
      preview: databasePreview(process.env.DATABASE_URL),
      description: "Dipakai Prisma untuk seluruh data ASCIT."
    }),
    envCheck({
      key: "NEXTAUTH_SECRET",
      label: "Secret session",
      category: "Autentikasi",
      required: true,
      secret: true,
      value: process.env.NEXTAUTH_SECRET,
      strongSecret: true,
      description: "Minimal 32 karakter non-placeholder untuk session production."
    }),
    envCheck({
      key: "NEXTAUTH_URL",
      label: "URL aplikasi",
      category: "Autentikasi",
      required: true,
      value: process.env.NEXTAUTH_URL,
      preview: process.env.NEXTAUTH_URL || "-",
      requireHttpsInProduction: true,
      description: "Harus sesuai domain aplikasi saat deploy."
    }),
    envCheck({
      key: "GROQ_API_KEY",
      label: "Kunci Groq",
      category: "AI Decision Support",
      required: settings.ai.enabled,
      secret: true,
      value: process.env.GROQ_API_KEY,
      description: "Dibaca hanya dari server, tidak pernah dikirim ke browser."
    }),
    envCheck({
      key: "GROQ_BASE_URL",
      label: "Endpoint Groq",
      category: "AI Decision Support",
      required: false,
      value: process.env.GROQ_BASE_URL || "https://api.Groq.ai/v1",
      preview: process.env.GROQ_BASE_URL || "default Groq",
      description: "Endpoint server-side untuk narasi rekomendasi AI."
    }),
    envCheck({
      key: "GROQ_MODEL",
      label: "Model AI",
      category: "AI Decision Support",
      required: false,
      value: process.env.GROQ_MODEL || settings.ai.defaultModel,
      preview: process.env.GROQ_MODEL || settings.ai.defaultModel,
      description: "Model default untuk penjelasan rekomendasi."
    })
  ];

  const blocking = envChecks.filter((item) => item.required && item.status !== "ok").length;
  const warnings = envChecks.filter((item) => item.status === "warning").length;

  return {
    environment: process.env.NODE_ENV || "development",
    serverTime: new Date(),
    timezone: settings.profile.timezone,
    uptimeSeconds: Math.round(process.uptime()),
    readiness: {
      status: blocking ? "blocked" : warnings ? "warning" : "ready",
      blocking,
      warnings,
      total: envChecks.length
    },
    ai: {
      enabled: settings.ai.enabled,
      providerName: settings.ai.providerName,
      configured: Boolean(process.env.GROQ_API_KEY),
      model: process.env.GROQ_MODEL || settings.ai.defaultModel,
      baseUrl: process.env.GROQ_BASE_URL || "https://api.Groq.ai/v1",
      maxTokens: Number(process.env.GROQ_MAX_TOKENS || 2048),
      timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 30000)
    },
    auth: {
      sessionMaxAgeHours: settings.security.sessionMaxAgeHours,
      publicRegistration: settings.security.allowPublicRegistration,
      allowedAdminRoles: settings.security.allowedAdminRoles
    },
    envChecks
  };
}

function envCheck(input: {
  key: string;
  label: string;
  category: string;
  required: boolean;
  value?: string;
  preview?: string;
  secret?: boolean;
  strongSecret?: boolean;
  requireHttpsInProduction?: boolean;
  description: string;
}) {
  const value = input.value?.trim() || "";
  const missing = !value || /ganti|change-this|isi_|placeholder/i.test(value);
  const weakSecret = input.strongSecret && Boolean(value) && value.length < 32;
  const invalidProductionUrl =
    input.requireHttpsInProduction &&
    process.env.NODE_ENV === "production" &&
    Boolean(value) &&
    !String(value).startsWith("https://");

  let status: "ok" | "warning" | "missing" = "ok";
  if (missing && input.required) status = "missing";
  else if (missing || weakSecret || invalidProductionUrl) status = "warning";

  return {
    key: input.key,
    label: input.label,
    category: input.category,
    required: input.required,
    secret: Boolean(input.secret),
    status,
    value: input.secret ? (missing ? "Belum dikonfigurasi" : "Terkonfigurasi") : input.preview || value || "-",
    description: input.description
  };
}

function databasePreview(value?: string) {
  if (!value) return "-";
  try {
    const url = new URL(value);
    const database = url.pathname.replace(/^\//, "") || "-";
    return `${url.protocol}//${url.hostname}:${url.port || "5432"}/${database}`;
  } catch {
    return "Format DATABASE_URL tidak valid";
  }
}

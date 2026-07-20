export type SystemProfileSettings = {
  systemName: string;
  systemSubtitle: string;
  organizationName: string;
  siteName: string;
  divisionName: string;
  supportEmail: string;
  supportPhone: string;
  timezone: string;
  dataScopeNote: string;
};

export type SystemOperationSettings = {
  warrantyWarningDays: number;
  assetWatchYears: number;
  assetCriticalYears: number;
  maintenanceReminderDays: number;
  qrBasePath: string;
  defaultReportFormat: "CSV" | "PRINT";
  requireMutationApproval: boolean;
  showExecutiveSummary: boolean;
};

export type SystemAiSettings = {
  enabled: boolean;
  providerName: string;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  allowNarrativeExplanation: boolean;
  maxAssetsPerRun: number;
  watchThreshold: number;
  upgradeThreshold: number;
  replacementThreshold: number;
  apiTimeoutSeconds: number;
  maxTokens: number;
  temperature: number;
  systemPromptStyle: "FORMAL" | "DETAILED" | "CONCISE";
};

export type SystemSecuritySettings = {
  sessionMaxAgeHours: number;
  auditRetentionDays: number;
  patientDataGuard: boolean;
  requireStrongPassword: boolean;
  allowPublicRegistration: boolean;
  allowedAdminRoles: string[];
};

export type SystemSettings = {
  profile: SystemProfileSettings;
  operations: SystemOperationSettings;
  ai: SystemAiSettings;
  security: SystemSecuritySettings;
};

type SettingDefinition<Key extends keyof SystemSettings = keyof SystemSettings> = {
  key: Key;
  description: string;
  defaultValue: SystemSettings[Key];
};

export const settingsAdminRoles = ["SUPER_ADMIN", "KEPALA_IT", "ADMIN_IT"] as const;

export const settingDefinitions: SettingDefinition[] = [
  {
    key: "profile",
    description: "Profil aplikasi, instansi, dan scope data ASCIT.",
    defaultValue: {
      systemName: "ASCIT",
      systemSubtitle: "Asset Care Information Technology System",
      organizationName: "RS Awal Bros",
      siteName: "RS Awal Bros Panam",
      divisionName: "IT SUPPORT",
      supportEmail: "it.support@awalbros.local",
      supportPhone: "-",
      timezone: "Asia/Jakarta",
      dataScopeNote: "Sistem hanya menyimpan dan memproses data aset teknologi informasi rumah sakit."
    }
  },
  {
    key: "operations",
    description: "Preferensi operasional aset, laporan, QR, dan lifecycle.",
    defaultValue: {
      warrantyWarningDays: 30,
      assetWatchYears: 3,
      assetCriticalYears: 5,
      maintenanceReminderDays: 7,
      qrBasePath: "/public/assets",
      defaultReportFormat: "CSV",
      requireMutationApproval: true,
      showExecutiveSummary: true
    }
  },
  {
    key: "ai",
    description: "Kebijakan AI Decision Support dan threshold prioritas aset.",
    defaultValue: {
      enabled: true,
      providerName: "Groq",
      apiKey: "",
      baseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "llama-3.1-8b-instant",
      allowNarrativeExplanation: true,
      maxAssetsPerRun: 100,
      watchThreshold: 30,
      upgradeThreshold: 60,
      replacementThreshold: 80,
      apiTimeoutSeconds: 30,
      maxTokens: 2048,
      temperature: 0.3,
      systemPromptStyle: "FORMAL"
    }
  },
  {
    key: "security",
    description: "Kebijakan akses, audit, dan batas data sensitif.",
    defaultValue: {
      sessionMaxAgeHours: 10,
      auditRetentionDays: 365,
      patientDataGuard: true,
      requireStrongPassword: true,
      allowPublicRegistration: false,
      allowedAdminRoles: ["SUPER_ADMIN", "KEPALA_IT", "ADMIN_IT"]
    }
  }
];

export function getDefaultSystemSettings(): SystemSettings {
  return settingDefinitions.reduce((settings, definition) => {
    return {
      ...settings,
      [definition.key]: structuredClone(definition.defaultValue)
    };
  }, {} as SystemSettings);
}

export function normalizeSystemSettings(input: Partial<SystemSettings> = {}): SystemSettings {
  const defaults = getDefaultSystemSettings();

  const profile = {
    ...defaults.profile,
    ...(isRecord(input.profile) ? input.profile : {})
  };
  const operations = {
    ...defaults.operations,
    ...(isRecord(input.operations) ? input.operations : {})
  };
  const ai = {
    ...defaults.ai,
    ...(isRecord(input.ai) ? input.ai : {})
  };
  const security = {
    ...defaults.security,
    ...(isRecord(input.security) ? input.security : {})
  };

  const normalized: SystemSettings = {
    profile: {
      systemName: requiredText(profile.systemName, "Nama sistem"),
      systemSubtitle: requiredText(profile.systemSubtitle, "Subtitle sistem"),
      organizationName: requiredText(profile.organizationName, "Nama organisasi"),
      siteName: requiredText(profile.siteName, "Nama site"),
      divisionName: requiredText(profile.divisionName, "Nama divisi"),
      supportEmail: optionalText(profile.supportEmail, defaults.profile.supportEmail),
      supportPhone: optionalText(profile.supportPhone, "-"),
      timezone: optionalText(profile.timezone, defaults.profile.timezone),
      dataScopeNote: requiredText(profile.dataScopeNote, "Catatan scope data")
    },
    operations: {
      warrantyWarningDays: numberInRange(operations.warrantyWarningDays, 1, 365, defaults.operations.warrantyWarningDays),
      assetWatchYears: numberInRange(operations.assetWatchYears, 1, 25, defaults.operations.assetWatchYears),
      assetCriticalYears: numberInRange(operations.assetCriticalYears, 1, 30, defaults.operations.assetCriticalYears),
      maintenanceReminderDays: numberInRange(operations.maintenanceReminderDays, 1, 90, defaults.operations.maintenanceReminderDays),
      qrBasePath: normalizePath(operations.qrBasePath, defaults.operations.qrBasePath),
      defaultReportFormat: operations.defaultReportFormat === "PRINT" ? "PRINT" : "CSV",
      requireMutationApproval: Boolean(operations.requireMutationApproval),
      showExecutiveSummary: Boolean(operations.showExecutiveSummary)
    },
    ai: {
      enabled: Boolean(ai.enabled),
      providerName: requiredText(ai.providerName, "Provider AI"),
      apiKey: optionalText(ai.apiKey, ""),
      baseUrl: optionalText(ai.baseUrl, "https://api.groq.com/openai/v1"),
      defaultModel: requiredText(ai.defaultModel, "Model AI"),
      allowNarrativeExplanation: Boolean(ai.allowNarrativeExplanation),
      maxAssetsPerRun: numberInRange(ai.maxAssetsPerRun, 1, 1000, defaults.ai.maxAssetsPerRun),
      watchThreshold: numberInRange(ai.watchThreshold, 1, 99, defaults.ai.watchThreshold),
      upgradeThreshold: numberInRange(ai.upgradeThreshold, 1, 99, defaults.ai.upgradeThreshold),
      replacementThreshold: numberInRange(ai.replacementThreshold, 1, 100, defaults.ai.replacementThreshold),
      apiTimeoutSeconds: numberInRange(ai.apiTimeoutSeconds ?? 30, 5, 120, defaults.ai.apiTimeoutSeconds),
      maxTokens: numberInRange(ai.maxTokens ?? 2048, 256, 8192, defaults.ai.maxTokens),
      temperature: numberInRange((ai.temperature ?? 0.3) * 100, 0, 100, defaults.ai.temperature * 100) / 100,
      systemPromptStyle: (ai.systemPromptStyle === "DETAILED" || ai.systemPromptStyle === "CONCISE") ? ai.systemPromptStyle : "FORMAL"
    },
    security: {
      sessionMaxAgeHours: numberInRange(security.sessionMaxAgeHours, 1, 24, defaults.security.sessionMaxAgeHours),
      auditRetentionDays: numberInRange(security.auditRetentionDays, 30, 3650, defaults.security.auditRetentionDays),
      patientDataGuard: Boolean(security.patientDataGuard),
      requireStrongPassword: Boolean(security.requireStrongPassword),
      allowPublicRegistration: false,
      allowedAdminRoles: normalizeRoles(security.allowedAdminRoles)
    }
  };

  if (normalized.operations.assetCriticalYears <= normalized.operations.assetWatchYears) {
    throw new Error("Batas umur aset kritis harus lebih besar dari batas pantau.");
  }
  if (!(normalized.ai.watchThreshold < normalized.ai.upgradeThreshold && normalized.ai.upgradeThreshold < normalized.ai.replacementThreshold)) {
    throw new Error("Threshold AI harus berurutan: pantau < upgrade < penggantian.");
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requiredText(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} wajib diisi.`);
  return text.slice(0, 500);
}

function optionalText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return (text || fallback).slice(0, 500);
}

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizePath(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.startsWith("/") ? text : `/${text}`;
}

function normalizeRoles(value: unknown) {
  const allowed = new Set(["SUPER_ADMIN", "KEPALA_IT", "ADMIN_IT"]);
  const roles = Array.isArray(value) ? value.map(String).filter((role) => allowed.has(role)) : [];
  return roles.length ? roles : ["SUPER_ADMIN", "KEPALA_IT", "ADMIN_IT"];
}

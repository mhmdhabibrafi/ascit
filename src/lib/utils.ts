import { clsx, type ClassValue } from "clsx";
import { differenceInDays, differenceInMonths, format } from "date-fns";
import { id } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy", { locale: id });
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy HH:mm", { locale: id });
}

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_IT: "Admin IT",
  STAF_IT: "Staff",
  KEPALA_IT: "Kepala IT",
  MANAJEMEN: "Manajemen"
};

const enumLabels: Record<string, string> = {
  AKTIF: "Aktif",
  AMAN: "Aman",
  BAIK: "Baik",
  DALAM_PERBAIKAN: "Dalam perbaikan",
  DIREKOMENDASIKAN_UPGRADE: "Direkomendasikan upgrade",
  GANTI_PERANGKAT: "Ganti perangkat",
  HABIS: "Habis",
  HAMPIR_HABIS: "Hampir habis",
  LAYAK_GANTI: "Layak ganti",
  MAINTENANCE_BERKALA: "Maintenance berkala",
  MENUNGGU: "Menunggu",
  PANTAU_PERANGKAT: "Pantau perangkat",
  PANTAU_PERANGKAT_DAN_RENCANAKAN_PENGGANTIAN: "Pantau perangkat dan rencanakan penggantian",
  PERLU_DIPANTAU: "Perlu dipantau",
  PRIORITAS_PENGGANTIAN: "Prioritas penggantian",
  RENCANAKAN_PENGGANTIAN: "Rencanakan penggantian",
  RUSAK_BERAT: "Rusak berat",
  RUSAK_RINGAN: "Rusak ringan",
  UPDATE_OS: "Update OS",
  UPGRADE_PROCESSOR: "Upgrade processor",
  UPGRADE_RAM: "Upgrade RAM",
  UPGRADE_STORAGE: "Upgrade storage"
};

export function humanizeRole(role?: string | null) {
  if (!role) return "Belum ada role";
  if (roleLabels[role]) return roleLabels[role];
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function roleDivisionLabel(role?: string | null) {
  if (role === "MANAJEMEN") return "MANAJEMEN";
  if (role === "SUPER_ADMIN") return "SISTEM";
  return "IT SUPPORT";
}

export function humanizeEnum(value?: string | null) {
  if (!value) return "-";
  if (enumLabels[value]) return enumLabels[value];
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeSystemText(value?: string | null) {
  if (!value) return "-";
  return String(value)
    .replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (token) => humanizeEnum(token))
    .replace(/\s+/g, " ")
    .trim();
}

export function getWarrantyInfo(endDate?: Date | string | null) {
  if (!endDate) {
    return { status: "HABIS", daysLeft: -1, label: "Habis" };
  }
  const date = typeof endDate === "string" ? new Date(endDate) : endDate;
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 0) return { status: "HABIS", daysLeft, label: "Habis" };
  if (daysLeft <= 30) return { status: "HAMPIR_HABIS", daysLeft, label: "Hampir habis" };
  return { status: "AKTIF", daysLeft, label: "Aktif" };
}

export function getAssetAge(purchaseDate?: Date | string | null) {
  if (!purchaseDate) return { years: 0, months: 0, label: "Tidak diketahui", tone: "muted" };
  const date = typeof purchaseDate === "string" ? new Date(purchaseDate) : purchaseDate;
  const months = Math.max(0, differenceInMonths(new Date(), date));
  const years = months / 12;
  if (years > 5) return { years, months, label: "Lebih dari 5 tahun", tone: "danger" };
  if (years >= 3) return { years, months, label: "3 sampai 5 tahun", tone: "warning" };
  return { years, months, label: "Kurang dari 3 tahun", tone: "success" };
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: Array<[string, string]>) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = columns.map(([, label]) => escape(label)).join(",");
  const body = rows.map((row) => columns.map(([key]) => escape(row[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function nextRunCode(prefix = "RUN") {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

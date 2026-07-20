import type {
  AiPriority,
  AiRecommendationType,
  AiScoreStatus,
  AssetConditionStatus,
  AssetLifecycleStatus
} from "@prisma/client";
import { differenceInYears } from "date-fns";

export type ScoringAsset = {
  assetCode: string;
  assetName: string;
  purchaseDate?: Date | string | null;
  processor?: string | null;
  ram?: string | null;
  storage?: string | null;
  operatingSystem?: string | null;
  conditionStatus: AssetConditionStatus;
  lifecycleStatus: AssetLifecycleStatus;
  warrantyEndDate?: Date | string | null;
  serviceRecords?: Array<{ cost?: number | string | { toString(): string } | null }>;
};

export type ScoreDetail = {
  factor: string;
  scoreImpact: number;
  message: string;
};

export type ScoreResult = {
  score: number;
  scoreStatus: AiScoreStatus;
  priority: AiPriority;
  recommendationTypes: AiRecommendationType[];
  details: ScoreDetail[];
};

function parseRamGb(ram?: string | null) {
  const match = String(ram || "").match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function isOldProcessor(processor?: string | null) {
  const value = String(processor || "").toLowerCase();
  return (
    value.includes("pentium") ||
    value.includes("celeron") ||
    value.includes("core 2") ||
    /gen\s?[1-7]\b/.test(value) ||
    /i[357]\s?-[1-7]\d{3}/.test(value)
  );
}

function isOldOs(os?: string | null) {
  const value = String(os || "").toLowerCase();
  return value.includes("windows 7") || value.includes("windows 8");
}

function isHdd(storage?: string | null) {
  return String(storage || "").toLowerCase().includes("hdd");
}

function warrantyExpired(endDate?: Date | string | null) {
  if (!endDate) return true;
  const date = typeof endDate === "string" ? new Date(endDate) : endDate;
  return date.getTime() < Date.now();
}

function sumRepairCost(asset: ScoringAsset) {
  return (asset.serviceRecords || []).reduce((sum, repair) => sum + Number(repair.cost ?? 0), 0);
}

function statusForScore(score: number): AiScoreStatus {
  if (score >= 80) return "PRIORITAS_PENGGANTIAN";
  if (score >= 60) return "DIREKOMENDASIKAN_UPGRADE";
  if (score >= 30) return "PERLU_DIPANTAU";
  return "AMAN";
}

function priorityForScore(score: number): AiPriority {
  if (score >= 80) return "kritis";
  if (score >= 60) return "tinggi";
  if (score >= 30) return "sedang";
  return "rendah";
}

export function scoreAsset(asset: ScoringAsset): ScoreResult {
  const details: ScoreDetail[] = [];
  let score = 0;
  const recommendations = new Set<AiRecommendationType>();
  const purchaseDate = asset.purchaseDate
    ? typeof asset.purchaseDate === "string"
      ? new Date(asset.purchaseDate)
      : asset.purchaseDate
    : null;
  const assetAge = purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? differenceInYears(new Date(), purchaseDate) : 0;
  const repairCount = asset.serviceRecords?.length || 0;
  const repairCost = sumRepairCost(asset);

  const add = (factor: string, scoreImpact: number, message: string, recommendation?: AiRecommendationType) => {
    score += scoreImpact;
    details.push({ factor, scoreImpact, message });
    if (recommendation) recommendations.add(recommendation);
  };

  if (assetAge > 5) add("Umur aset", 30, "Umur aset lebih dari 5 tahun.", "REPLACE");
  if (isOldProcessor(asset.processor)) add("Processor", 25, "Processor terdeteksi generasi lama atau tidak sesuai standar.", "UPGRADE");
  if (parseRamGb(asset.ram) > 0 && parseRamGb(asset.ram) < 8) add("RAM", 20, "Kapasitas RAM kurang dari 8 GB.", "UPGRADE");
  if (isHdd(asset.storage)) add("Storage", 15, "Media penyimpanan masih HDD.", "UPGRADE");
  if (warrantyExpired(asset.warrantyEndDate)) add("Garansi", 10, "Masa garansi aset sudah habis.", undefined);
  if (repairCount > 3) add("Frekuensi perbaikan", 25, "Jumlah perbaikan lebih dari 3 kali.", "REPLACE");
  if (repairCost > 1000000) add("Biaya perbaikan", 20, "Total biaya perbaikan lebih dari Rp1.000.000.", "REPLACE");
  if (asset.conditionStatus === "RUSAK_BERAT") add("Kondisi", 20, "Kondisi aset rusak berat.", "REPLACE");
  if (asset.conditionStatus === "LAYAK_GANTI") add("Kondisi", 30, "Aset sudah ditandai layak ganti.", "REPLACE");
  if (isOldOs(asset.operatingSystem)) add("Sistem operasi", 15, "Sistem operasi lama terdeteksi.", "UPGRADE");

  if (!recommendations.size) {
    if (score >= 30) {
      // Nothing
    }
  }

  const cappedScore = Math.min(100, score);
  return {
    score: cappedScore,
    scoreStatus: statusForScore(cappedScore),
    priority: priorityForScore(cappedScore),
    recommendationTypes: Array.from(recommendations),
    details
  };
}

export function fallbackAiExplanation(asset: ScoringAsset, score: ScoreResult) {
  const reasons = score.details.map((detail) => detail.message).join(" ");
  const recommendation =
    score.scoreStatus === "PRIORITAS_PENGGANTIAN"
      ? "Prioritaskan penggantian perangkat."
      : score.scoreStatus === "DIREKOMENDASIKAN_UPGRADE"
        ? "Rencanakan upgrade komponen utama."
        : score.scoreStatus === "PERLU_DIPANTAU"
          ? "Pantau perangkat melalui maintenance berkala."
          : "Perangkat masih aman digunakan.";

  return {
    summary: `${asset.assetCode} - ${asset.assetName} memperoleh skor ${score.score}.`,
    recommendation,
    priority: score.priority,
    recommendedActions: score.recommendationTypes,
    reason: reasons || "Tidak ada faktor risiko signifikan dari rule engine.",
    nextYearPlan:
      score.score >= 60
        ? "Masukkan aset ke rencana evaluasi anggaran IT tahun depan."
        : "Lanjutkan monitoring dan maintenance berkala."
  };
}

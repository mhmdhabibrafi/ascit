import type { Prisma } from "@prisma/client";
import { fallbackAiExplanation, scoreAsset } from "@/lib/ai/scoring-engine";
import { askGroq } from "@/lib/ai/Groq";
import { prisma } from "@/lib/prisma";
import { nextRunCode } from "@/lib/utils";

type RunOptions = {
  createdById?: string;
  year?: number;
  unitId?: string;
  categoryId?: string;
  useGroq?: boolean;
};

export async function runAiAssetAnalysis(options: RunOptions = {}) {
  const where: Prisma.AssetWhereInput = {
    deletedAt: null,
    ...(options.unitId ? { unitId: options.unitId } : {}),
    ...(options.categoryId ? { categoryId: options.categoryId } : {})
  };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      unit: true,
      room: true,
      category: true,
      brand: true,
      vendor: true,
      serviceRecords: true
    },
    orderBy: { assetCode: "asc" }
  });

  let aiModelName = process.env.GROQ_MODEL || "deepseek-v4-flash";
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "ai" } });
    if (row && row.value && typeof row.value === "object") {
      const val = row.value as any;
      if (val.defaultModel) aiModelName = val.defaultModel;
    }
  } catch {}

  const run = await prisma.aiAnalysisRun.create({
    data: {
      runCode: nextRunCode("AI"),
      year: options.year || new Date().getFullYear() + 1,
      unitId: options.unitId,
      categoryId: options.categoryId,
      totalAssets: assets.length,
      model: aiModelName,
      summary: "Analisis sedang dibuat dari rule engine ASCIT.",
      createdById: options.createdById
    }
  });

  let criticalCount = 0;
  let upgradeCount = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const score = scoreAsset(asset);
    const ai = options.useGroq === false ? { ok: false as const, error: "AI dilewati." } : await askGroq(asset, score);
    const explanation = ai.ok ? ai.data : fallbackAiExplanation(asset, score);
    
    if (score.scoreStatus === "PRIORITAS_PENGGANTIAN") criticalCount += 1;
    if (score.scoreStatus === "DIREKOMENDASIKAN_UPGRADE") upgradeCount += 1;

    await prisma.aiAssetRecommendation.create({
      data: {
        runId: run.id,
        assetId: asset.id,
        score: score.score,
        scoreStatus: score.scoreStatus,
        recommendationTypes: score.recommendationTypes,
        priority: explanation.priority,
        summary: explanation.summary,
        recommendation: explanation.recommendation,
        reason: explanation.reason,
        nextYearPlan: explanation.nextYearPlan,
        openModelSucceeded: ai.ok,
        openModelErrorMessage: ai.ok ? null : ai.error,
        details: {
          create: score.details.map((detail) => ({
            factor: detail.factor,
            scoreImpact: detail.scoreImpact,
            message: detail.message
          }))
        }
      }
    });

    if (score.score >= 60 || asset.conditionStatus === "LAYAK_GANTI") {
      await prisma.assetReplacementRecommendation.create({
        data: {
          assetId: asset.id,
          score: score.score,
          status: score.scoreStatus,
          recommendationTypes: score.recommendationTypes,
          reason: explanation.reason,
          source: ai.ok ? "RULE_ENGINE_Groq" : "RULE_ENGINE",
          year: run.year
        }
      });
    }

    await prisma.assetLifecycleLog.create({
      data: {
        assetId: asset.id,
        status: asset.lifecycleStatus,
        description: `Analisis AI ${run.runCode}: skor ${score.score}, status ${score.scoreStatus}.`,
        createdById: options.createdById
      }
    });
  }

  return prisma.aiAnalysisRun.update({
    where: { id: run.id },
    data: {
      summary: `Analisis ${assets.length} aset selesai. ${criticalCount} prioritas penggantian dan ${upgradeCount} rekomendasi upgrade ditemukan.`
    },
    include: {
      recommendations: {
        include: {
          asset: {
            include: {
              unit: true,
              category: true,
              brand: true
            }
          },
          details: true
        },
        orderBy: { score: "desc" }
      }
    }
  });
}

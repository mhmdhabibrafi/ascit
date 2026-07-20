import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { scoreAsset } from "@/lib/ai/scoring-engine";
import { prisma } from "@/lib/prisma";
import { getWarrantyInfo } from "@/lib/utils";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const [assets, totalUnits, maintenanceThisMonth, repairs, upcomingMaintenance] = await Promise.all([
    prisma.asset.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        assetCode: true,
        assetName: true,
        purchaseDate: true,
        processor: true,
        ram: true,
        storage: true,
        operatingSystem: true,
        warrantyEndDate: true,
        conditionStatus: true,
        lifecycleStatus: true,
        category: { select: { name: true } },
        unit: { select: { name: true } },
        serviceRecords: { select: { cost: true } }
      },
      orderBy: { assetCode: "asc" }
    }),
    prisma.unit.count(),
    prisma.serviceRecord.count({
      where: {
        type: "PREVENTIVE",
        scheduledDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      }
    }),
    prisma.serviceRecord.findMany({
      where: { type: "CORRECTIVE" },
      select: { scheduledDate: true },
      orderBy: { scheduledDate: "asc" }
    }),
    prisma.serviceRecord.findMany({
      where: { type: "PREVENTIVE", scheduledDate: { gte: new Date() } },
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        asset: { select: { assetName: true } }
      },
      orderBy: { scheduledDate: "asc" },
      take: 6
    })
  ]);

  const warrantySoon = assets.filter((asset) => getWarrantyInfo(asset.warrantyEndDate).status === "HAMPIR_HABIS");
  const scoredAssets = assets.map((asset) => ({ asset, score: scoreAsset(asset) })).sort((a, b) => b.score.score - a.score.score);
  const countBy = (key: "category" | "unit" | "conditionStatus") => {
    const map = new Map<string, number>();
    for (const asset of assets) {
      const label = key === "category" ? asset.category.name : key === "unit" ? asset.unit.name : asset.conditionStatus;
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  };

  const repairTrendMap = new Map<string, number>();
  for (const repair of repairs) {
    if (!repair.scheduledDate) continue;
    const key = repair.scheduledDate.toISOString().slice(0, 7);
    repairTrendMap.set(key, (repairTrendMap.get(key) || 0) + 1);
  }

  const treemapMap = new Map<string, Map<string, number>>();
  for (const asset of assets) {
    const cat = asset.category?.name || "Umum";
    const cond = asset.conditionStatus;
    if (!treemapMap.has(cat)) treemapMap.set(cat, new Map());
    treemapMap.get(cat)!.set(cond, (treemapMap.get(cat)!.get(cond) || 0) + 1);
  }
  const treemapData = Array.from(treemapMap.entries()).map(([name, condMap]) => ({
    name,
    children: Array.from(condMap.entries()).map(([cond, size]) => ({ name: cond, size }))
  }));

  return NextResponse.json({
    stats: {
      totalAssets: assets.length,
      activeAssets: assets.filter((asset) => asset.lifecycleStatus === "AKTIF").length,
      brokenAssets: assets.filter((asset) => ["RUSAK_RINGAN", "RUSAK_BERAT"].includes(asset.conditionStatus)).length,
      repairingAssets: assets.filter((asset) => asset.lifecycleStatus === "DALAM_PERBAIKAN").length,
      replaceAssets: assets.filter((asset) => asset.conditionStatus === "LAYAK_GANTI").length,
      warrantySoon: warrantySoon.length,
      maintenanceThisMonth,
      totalUnits,
      criticalAssets: scoredAssets.filter((item) => item.score.scoreStatus === "PRIORITAS_PENGGANTIAN").length,
      upgradeRecommendedAssets: scoredAssets.filter((item) => item.score.scoreStatus === "DIREKOMENDASIKAN_UPGRADE").length
    },
    charts: {
      byCategory: countBy("category"),
      byCondition: countBy("conditionStatus"),
      byUnit: countBy("unit"),
      repairTrend: Array.from(repairTrendMap.entries()).map(([name, total]) => ({ name, total })),
      treemapData
    },
    tables: {
      warrantySoon: warrantySoon.slice(0, 6).map((asset) => ({
        id: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        warrantyEndDate: asset.warrantyEndDate,
        conditionStatus: asset.conditionStatus,
        lifecycleStatus: asset.lifecycleStatus,
        unit: asset.unit
      })),
      problemAssets: assets
        .filter((asset) => asset.conditionStatus !== "BAIK" || asset.lifecycleStatus === "DALAM_PERBAIKAN")
        .slice(0, 6)
        .map((asset) => ({
          id: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          conditionStatus: asset.conditionStatus,
          lifecycleStatus: asset.lifecycleStatus,
          unit: asset.unit
        })),
      upcomingMaintenance,
      aiPriority: scoredAssets.slice(0, 6).map(({ asset, score }) => ({
        asset: {
          id: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName
        },
        score: {
          score: score.score,
          scoreStatus: score.scoreStatus
        }
      }))
    }
  });
}

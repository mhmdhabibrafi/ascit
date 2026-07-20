import { NextResponse } from "next/server";
import { scoreAsset } from "@/lib/ai/scoring-engine";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAssetAge, getWarrantyInfo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const assets = await prisma.asset.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      unit: true,
      room: true,
      serviceRecords: true
    },
    orderBy: { purchaseDate: "asc" }
  });

  return NextResponse.json({
    data: assets.map((asset) => ({
      ...asset,
      assetAge: getAssetAge(asset.purchaseDate),
      warrantyInfo: getWarrantyInfo(asset.warrantyEndDate),
      repairCount: asset.serviceRecords.length,
      recommendation: scoreAsset(asset)
    }))
  });
}

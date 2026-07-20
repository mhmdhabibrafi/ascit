import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const data = await prisma.assetReplacementRecommendation.findMany({
    include: {
      asset: {
        include: {
          unit: true,
          room: true,
          category: true,
          brand: true
        }
      }
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ data });
}

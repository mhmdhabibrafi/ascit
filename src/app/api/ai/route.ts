import { NextRequest, NextResponse } from "next/server";
import { forbidden, hasAnyRole, requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { runAiAssetAnalysis } from "@/lib/ai/recommendation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const unitId = request.nextUrl.searchParams.get("unitId") || undefined;
  const categoryId = request.nextUrl.searchParams.get("categoryId") || undefined;
  const year = request.nextUrl.searchParams.get("year");

  const runs = await prisma.aiAnalysisRun.findMany({
    where: {
      ...(unitId ? { unitId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(year ? { year: Number(year) } : {})
    },
    include: {
      unit: true,
      category: true,
      recommendations: {
        include: {
          asset: {
            include: {
              unit: true,
              category: true,
              brand: true,
              serviceRecords: true
            }
          },
          details: true
        },
        orderBy: { score: "desc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const latestRun =
    runs.find((run) => run.totalAssets > 0 && run.recommendations.length >= run.totalAssets) ||
    runs.find((run) => run.recommendations.length > 0) ||
    runs[0] ||
    null;

  return NextResponse.json({ data: latestRun });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, ["SUPER_ADMIN", "ADMIN_IT", "KEPALA_IT"])) return forbidden();
  const limit = checkRateLimit(`ai-run:${session.user.id}`, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan analisis AI. Silakan coba kembali nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const run = await runAiAssetAnalysis({
    createdById: session.user.id,
    year: body.year ? Number(body.year) : undefined,
    unitId: body.unitId || undefined,
    categoryId: body.categoryId || undefined,
    useGroq: body.useGroq !== false
  });

  await createAuditLog({
    session,
    action: "AI_ANALYSIS",
    module: "AI Decision Support",
    description: `${run.runCode} selesai untuk ${run.totalAssets} aset.`,
    ipAddress: requestIp(request)
  });

  return NextResponse.json({ data: run }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { forbidden, hasAnyRole, requireSession, requestIp, validateRoomInUnit } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const include = {
  asset: true,
  fromUnit: true,
  fromRoom: true,
  toUnit: true,
  toRoom: true,
  oldResponsibleUser: { select: { id: true, name: true } },
  newResponsibleUser: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } }
};

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const data = await prisma.assetMutation.findMany({
    include,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, ["SUPER_ADMIN", "ADMIN_IT", "STAF_IT"])) return forbidden();

  const body = await request.json();
  const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
  if (!asset) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });
  if (!body.toUnitId || !body.toRoomId || !body.reason) {
    return NextResponse.json({ error: "Unit tujuan, ruangan tujuan, dan alasan wajib diisi." }, { status: 400 });
  }
  if (!(await validateRoomInUnit(body.toRoomId, body.toUnitId))) {
    return NextResponse.json({ error: "Ruangan tujuan tidak terdaftar pada unit tujuan." }, { status: 400 });
  }

  const mutation = await prisma.assetMutation.create({
    data: {
      assetId: asset.id,
      fromUnitId: asset.unitId,
      fromRoomId: asset.roomId,
      toUnitId: body.toUnitId,
      toRoomId: body.toRoomId,
      oldResponsibleUserId: asset.responsibleUserId,
      newResponsibleUserId: body.newResponsibleUserId || undefined,
      mutationDate: body.mutationDate ? new Date(body.mutationDate) : new Date(),
      reason: body.reason,
      createdById: session.user.id,
      notes: body.notes || undefined
    },
    include
  });

  await createAuditLog({
    session,
    action: "CREATE_MUTATION",
    module: "Mutasi Aset",
    description: `Pengajuan mutasi ${asset.assetCode} dibuat.`,
    ipAddress: requestIp(request)
  });

  return NextResponse.json({ data: mutation }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  if (!hasAnyRole(session.user.role, ["SUPER_ADMIN", "ADMIN_IT", "KEPALA_IT"])) {
    return NextResponse.json({ error: "Hanya Kepala IT atau Admin yang dapat menyetujui mutasi." }, { status: 403 });
  }

  const body = await request.json();
  if (!body.id || !["DISETUJUI", "DITOLAK", "DIBATALKAN"].includes(body.approvalStatus)) {
    return NextResponse.json({ error: "Status persetujuan tidak valid." }, { status: 400 });
  }

  const current = await prisma.assetMutation.findUnique({ where: { id: body.id }, include: { asset: true } });
  if (!current) return NextResponse.json({ error: "Mutasi tidak ditemukan." }, { status: 404 });
  if (current.approvalStatus !== "MENUNGGU") {
    return NextResponse.json({ error: `Mutasi sudah diproses (${current.approvalStatus}).` }, { status: 400 });
  }
  if (!(await validateRoomInUnit(current.toRoomId, current.toUnitId))) {
    return NextResponse.json({ error: "Ruangan tujuan tidak lagi valid untuk unit tujuan." }, { status: 400 });
  }

  const mutation = await prisma.$transaction(async (tx) => {
    const updated = await tx.assetMutation.update({
      where: { id: current.id },
      data: {
        approvalStatus: body.approvalStatus,
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: body.notes || current.notes
      },
      include
    });

    if (body.approvalStatus === "DISETUJUI") {
      await tx.asset.update({
        where: { id: current.assetId },
        data: {
          unitId: current.toUnitId,
          roomId: current.toRoomId,
          responsibleUserId: current.newResponsibleUserId || current.asset.responsibleUserId,
          lifecycleStatus: "DIPINDAHKAN",
          lifecycleLogs: {
            create: {
              status: "DIPINDAHKAN",
              description: `Mutasi disetujui: ${current.reason}`,
              createdById: session.user.id
            }
          }
        }
      });
    }

    return updated;
  });

  await createAuditLog({
    session,
    action: "APPROVE_MUTATION",
    module: "Mutasi Aset",
    description: `Mutasi ${current.asset.assetCode} diubah menjadi ${body.approvalStatus}.`,
    ipAddress: requestIp(request)
  });

  return NextResponse.json({ data: mutation });
}

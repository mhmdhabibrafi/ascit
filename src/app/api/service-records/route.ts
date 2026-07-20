import { NextRequest, NextResponse } from "next/server";
import { forbidden, hasAnyRole, requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const serviceWriteRoles = ["SUPER_ADMIN", "ADMIN_IT", "STAF_IT"];

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const records = await prisma.serviceRecord.findMany({
      include: {
        asset: true,
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ data: records });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, serviceWriteRoles)) return forbidden();

  try {
    const body = await req.json();
    if (!body.assetId || !body.type) {
      return NextResponse.json({ error: "Asset ID dan tipe perbaikan wajib diisi." }, { status: 400 });
    }

    const record = await prisma.serviceRecord.create({
      data: {
        assetId: body.assetId,
        type: body.type,
        status: body.status || "TERJADWAL",
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        completedDate: body.completedDate ? new Date(body.completedDate) : null,
        technicianName: body.technicianName || null,
        symptoms: body.symptoms || null,
        actionTaken: body.actionTaken || null,
        replacedComponents: body.replacedComponents || null,
        cost: body.cost || 0,
        notes: body.notes || null,
        createdById: session.user.id
      },
      include: { asset: true }
    });

    await createAuditLog({
      session,
      action: "CREATE_SERVICE_RECORD",
      module: "Service Record",
      description: `Service record untuk ${record.asset.assetCode} dibuat.`,
      ipAddress: requestIp(req)
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat service record." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, serviceWriteRoles)) return forbidden();

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "ID service record wajib diisi." }, { status: 400 });

    const existing = await prisma.serviceRecord.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Service record tidak ditemukan." }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.technicianName !== undefined) data.technicianName = body.technicianName || null;
    if (body.symptoms !== undefined) data.symptoms = body.symptoms || null;
    if (body.actionTaken !== undefined) data.actionTaken = body.actionTaken || null;
    if (body.replacedComponents !== undefined) data.replacedComponents = body.replacedComponents || null;
    if (body.cost !== undefined) data.cost = Number(body.cost) || 0;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    if (body.completedDate !== undefined) data.completedDate = body.completedDate ? new Date(body.completedDate) : null;

    const record = await prisma.serviceRecord.update({
      where: { id: body.id },
      data,
      include: { asset: true }
    });

    await createAuditLog({
      session,
      action: "UPDATE_SERVICE_RECORD",
      module: "Service Record",
      description: `Service record untuk ${record.asset.assetCode} diperbarui.`,
      ipAddress: requestIp(req)
    });

    return NextResponse.json({ data: record });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui service record." }, { status: 500 });
  }
}

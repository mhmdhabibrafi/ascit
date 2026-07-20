import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { forbidden, hasAnyRole, requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { ensureDefaultMasterData } from "@/lib/master-data-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const modelMap = {
  units: prisma.unit,
  rooms: prisma.room,
  categories: prisma.assetCategory,
  segments: prisma.segment,
  brands: prisma.brand,
  vendors: prisma.vendor,
  technicians: prisma.technician
} as const;

const masterDataAdminRoles = ["SUPER_ADMIN", "ADMIN_IT", "KEPALA_IT"];
const activeUserSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  role: true,
  isActive: true
} as const;

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const [roles, users, units, rooms, categories, segments, brands, vendors, technicians] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: activeUserSelect, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ include: { _count: { select: { rooms: true, assets: true } } }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { unit: true, _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    prisma.assetCategory.findMany({ include: { _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    prisma.segment.findMany({ include: { _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ include: { _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ include: { _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    prisma.technician.findMany({ orderBy: { name: "asc" } })
  ]);

  return NextResponse.json({
    roles,
    users,
    units,
    rooms,
    categories,
    segments,
    brands,
    vendors,
    technicians,
    conditions: ["BAIK", "DIHAPUS", "LAYAK_GANTI", "RUSAK_BERAT", "RUSAK_RINGAN"],
    lifecycleStatuses: [
      "AKTIF",
      "DALAM_PERBAIKAN",
      "DIHAPUS",
      "DIPINDAHKAN",
      "DIPINJAM",
      "INSTALASI",
      "LAYAK_GANTI",
      "MAINTENANCE",
      "PENERIMAAN",
      "PENGADAAN",
      "RUSAK"
    ],
    mutationStatuses: ["DIBATALKAN", "DISETUJUI", "DITOLAK", "MENUNGGU"]
  });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, masterDataAdminRoles)) return forbidden();

  const body = await request.json();
  if (body.action === "ensureDefaults") {
    const summary = await ensureDefaultMasterData();
    await createAuditLog({
      session,
      action: "ENSURE_MASTER_DATA",
      module: "Master Data",
      description: "Referensi master data standar ASCIT dilengkapi.",
      ipAddress: requestIp(request)
    });
    return NextResponse.json({ data: summary });
  }

  const type = body.type as keyof typeof modelMap;
  if (!modelMap[type]) return NextResponse.json({ error: "Tipe master data tidak valid." }, { status: 400 });

  try {
    const data = buildPayload(type, body);
    const item = await (modelMap[type] as never as { create(args: { data: Record<string, unknown> }): Promise<unknown> }).create({ data });
    await createAuditLog({
      session,
      action: "CREATE_MASTER_DATA",
      module: "Master Data",
      description: `${type} ditambahkan: ${body.name}.`,
      ipAddress: requestIp(request)
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, masterDataAdminRoles)) return forbidden();

  const body = await request.json();
  const type = body.type as keyof typeof modelMap;
  if (!modelMap[type]) return NextResponse.json({ error: "Tipe master data tidak valid." }, { status: 400 });
  if (!body.id) return NextResponse.json({ error: "ID master data wajib diisi." }, { status: 400 });

  try {
    const data = buildPayload(type, body);
    const item = await (
      modelMap[type] as never as { update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown> }
    ).update({ where: { id: body.id }, data });

    await createAuditLog({
      session,
      action: "UPDATE_MASTER_DATA",
      module: "Master Data",
      description: `${type} diperbarui: ${body.name}.`,
      ipAddress: requestIp(request)
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, masterDataAdminRoles)) return forbidden();

  const body = await request.json();
  const type = body.type as keyof typeof modelMap;
  if (!modelMap[type]) return NextResponse.json({ error: "Tipe master data tidak valid." }, { status: 400 });
  if (!body.id) return NextResponse.json({ error: "ID master data wajib diisi." }, { status: 400 });

  try {
    await (modelMap[type] as never as { delete(args: { where: { id: string } }): Promise<unknown> }).delete({ where: { id: body.id } });
    await createAuditLog({
      session,
      action: "DELETE_MASTER_DATA",
      module: "Master Data",
      description: `${type} dihapus: ${body.name || body.id}.`,
      ipAddress: requestIp(request)
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function cleanText(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function autoCode(value: unknown) {
  const name = String(value || "").trim();
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 6)
    .toUpperCase() || "REF";
}

function buildPayload(type: keyof typeof modelMap, body: Record<string, unknown>) {
  const name = cleanText(body.name);
  if (!name) throw new Error("Nama wajib diisi.");

  if (type === "rooms") {
    const unitId = cleanText(body.unitId);
    if (!unitId) throw new Error("Unit wajib dipilih.");
    return {
      name,
      code: cleanText(body.code) || autoCode(name),
      unitId,
      description: cleanText(body.description)
    };
  }

  if (type === "vendors") {
    return {
      name,
      contact: cleanText(body.contact),
      phone: cleanText(body.phone),
      email: cleanText(body.email),
      address: cleanText(body.address)
    };
  }

  if (type === "technicians") {
    return {
      name,
      phone: cleanText(body.phone),
      specialty: cleanText(body.specialty),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive)
    };
  }

  if (type === "brands") {
    return {
      name,
      description: cleanText(body.description)
    };
  }

  return {
    name,
    code: cleanText(body.code) || autoCode(name),
    description: cleanText(body.description)
  };
}

function errorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Data dengan nama atau kode tersebut sudah ada." }, { status: 400 });
    }
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Data masih dipakai oleh modul lain." }, { status: 400 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    }
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan master data." },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Gagal menyimpan master data." }, { status: 400 });
}

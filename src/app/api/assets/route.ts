import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { forbidden, hasAnyRole, requireSession, requestIp, validateRoomInUnit } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { masterDataCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const assetWriteRoles = ["SUPER_ADMIN", "ADMIN_IT", "STAF_IT"];

const assetSchema = z.object({
  assetCode: z.string().min(2),
  assetName: z.string().min(2),
  categoryId: z.string().min(1),
  segmentId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  unitId: z.string().min(1),
  roomId: z.string().min(1),
  responsibleUserId: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
  operatingSystem: z.string().optional().nullable(),
  processor: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.coerce.number().optional().default(0),
  invoiceNumber: z.string().optional().nullable(),
  warrantyStartDate: z.string().optional().nullable(),
  warrantyEndDate: z.string().optional().nullable(),
  conditionStatus: z.string().default("BAIK"),
  lifecycleStatus: z.string().default("AKTIF"),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

const assetListSelect = {
  id: true,
  assetCode: true,
  assetName: true,
  categoryId: true,
  segmentId: true,
  brandId: true,
  vendorId: true,
  unitId: true,
  roomId: true,
  responsibleUserId: true,
  model: true,
  serialNumber: true,
  ipAddress: true,
  macAddress: true,
  operatingSystem: true,
  processor: true,
  ram: true,
  storage: true,
  purchaseDate: true,
  purchasePrice: true,
  invoiceNumber: true,
  warrantyStartDate: true,
  warrantyEndDate: true,
  conditionStatus: true,
  lifecycleStatus: true,
  qrToken: true,
  photoUrl: true,
  notes: true,
  category: {
    select: { id: true, name: true, code: true }
  },
  segment: {
    select: { id: true, name: true }
  },
  brand: {
    select: { id: true, name: true }
  },
  vendor: {
    select: { id: true, name: true }
  },
  unit: {
    select: { id: true, name: true, code: true }
  },
  room: {
    select: { id: true, name: true, code: true, unitId: true }
  },
  responsibleUser: {
    select: { id: true, name: true, email: true }
  }
} as const;

async function getDefaultBrandId() {
  const brand = await prisma.brand.upsert({
    where: { name: "Tidak diketahui" },
    update: {},
    create: { name: "Tidak diketahui" }
  });
  return brand.id;
}

async function getDefaultVendorId() {
  const vendor = await prisma.vendor.upsert({
    where: { name: "Tidak diketahui" },
    update: {},
    create: { name: "Tidak diketahui" }
  });
  return vendor.id;
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim();
  const categoryId = searchParams.get("categoryId") || undefined;
  const unitId = searchParams.get("unitId") || undefined;
  const segmentId = searchParams.get("segmentId") || undefined;
  const conditionStatus = searchParams.get("conditionStatus") || undefined;
  const lifecycleStatus = searchParams.get("lifecycleStatus") || undefined;

  const assets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(segmentId ? { segmentId } : {}),
      ...(conditionStatus ? { conditionStatus: conditionStatus as never } : {}),
      ...(lifecycleStatus ? { lifecycleStatus: lifecycleStatus as never } : {}),
      ...(search
        ? {
            OR: [
              { assetCode: { contains: search, mode: "insensitive" } },
              { assetName: { contains: search, mode: "insensitive" } },
              { serialNumber: { contains: search, mode: "insensitive" } },
              { ipAddress: { contains: search, mode: "insensitive" } },
              { macAddress: { contains: search, mode: "insensitive" } },
              { qrToken: { contains: search, mode: "insensitive" } },
              { unit: { name: { contains: search, mode: "insensitive" } } },
              { room: { name: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    select: assetListSelect,
    orderBy: { assetCode: "asc" }
  });

  return NextResponse.json({ data: assets });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, assetWriteRoles)) return forbidden();

  const parsed = assetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data aset belum valid", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (!(await validateRoomInUnit(data.roomId, data.unitId))) {
    return NextResponse.json({ error: "Ruangan tidak terdaftar pada unit yang dipilih." }, { status: 400 });
  }
  const [brandId, vendorId] = await Promise.all([
    data.brandId || getDefaultBrandId(),
    data.vendorId || getDefaultVendorId()
  ]);
  const qrToken = `ASCIT-${data.assetCode}`;
  const qrCodeUrl = await QRCode.toDataURL(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/public/assets/${encodeURIComponent(qrToken)}`);

  try {
    const asset = await prisma.asset.create({
      data: {
        assetCode: data.assetCode,
        assetName: data.assetName,
        categoryId: data.categoryId,
        segmentId: data.segmentId || undefined,
        brandId,
        vendorId,
        unitId: data.unitId,
        roomId: data.roomId,
        responsibleUserId: data.responsibleUserId || undefined,
        model: data.model || undefined,
        serialNumber: data.serialNumber || undefined,
        ipAddress: data.ipAddress || undefined,
        macAddress: data.macAddress || undefined,
        operatingSystem: data.operatingSystem || undefined,
        processor: data.processor || undefined,
        ram: data.ram || undefined,
        storage: data.storage || undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        invoiceNumber: data.invoiceNumber || undefined,
        warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
        warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
        conditionStatus: data.conditionStatus as never,
        lifecycleStatus: data.lifecycleStatus as never,
        qrToken,
        qrCodeUrl,
        photoUrl: data.photoUrl || undefined,
        notes: data.notes || undefined,
        createdById: session.user.id,
        lifecycleLogs: {
          create: {
            status: data.lifecycleStatus as never,
            description: "Aset dibuat melalui form ASCIT.",
            createdById: session.user.id
          }
        }
      },
      select: assetListSelect
    });

    await createAuditLog({
      session,
      action: "CREATE_ASSET",
      module: "Data Aset IT",
      description: `${asset.assetCode} - ${asset.assetName} dibuat.`,
      ipAddress: requestIp(request)
    });

    masterDataCache.invalidateAll();

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat aset." },
      { status: 400 }
    );
  }
}

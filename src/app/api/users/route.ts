import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { forbidden, hasAnyRole, requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const userAdminRoles = ["SUPER_ADMIN", "ADMIN_IT", "KEPALA_IT"];
const userSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

function canManageUsers(role?: string) {
  return hasAnyRole(role, userAdminRoles);
}

function isStrongPassword(value: unknown) {
  const password = String(value || "");
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!canManageUsers(session.user.role)) return forbidden();

  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await request.json();
  if (!body.email || !body.name || !body.password || !body.roleId) {
    return NextResponse.json({ error: "Nama, email, password, dan role wajib diisi." }, { status: 400 });
  }
  if (!canManageUsers(session.user.role)) return forbidden();
  if (!isStrongPassword(body.password)) {
    return NextResponse.json({ error: "Password minimal 8 karakter dan harus berisi huruf serta angka." }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah digunakan." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash: await bcrypt.hash(body.password, 10),
        roleId: body.roleId,
        isActive: body.isActive ?? true
      },
      select: userSelect
    });
    await createAuditLog({
      session,
      action: "CREATE_USER",
      module: "Pengguna",
      description: `${user.email} dibuat.`,
      ipAddress: requestIp(request)
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat user." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID user wajib diisi." }, { status: 400 });
  if (!canManageUsers(session.user.role)) return forbidden();

  // Prevent deactivating oneself
  if (body.id === session.user.id && typeof body.isActive === "boolean" && !body.isActive) {
    return NextResponse.json({ error: "Anda tidak dapat menonaktifkan akun Anda sendiri." }, { status: 400 });
  }

  // Prevent changing one's own role to a non-admin role
  if (body.id === session.user.id && body.roleId) {
    const newRole = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (newRole && !userAdminRoles.includes(newRole.name)) {
      return NextResponse.json({ error: "Anda tidak dapat mencabut hak akses admin Anda sendiri." }, { status: 400 });
    }
  }

  if (body.password && !isStrongPassword(body.password)) {
    return NextResponse.json({ error: "Password minimal 8 karakter dan harus berisi huruf serta angka." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.email) data.email = String(body.email).toLowerCase();
  if (body.roleId) data.roleId = body.roleId;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  try {
    const user = await prisma.user.update({
      where: { id: body.id },
      data,
      select: userSelect
    });

    await createAuditLog({
      session,
      action: "UPDATE_USER",
      module: "Pengguna",
      description: `${user.email} diperbarui.`,
      ipAddress: requestIp(request)
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    const msg = error instanceof Error && error.message.includes("Unique constraint")
      ? "Email sudah digunakan oleh pengguna lain."
      : error instanceof Error ? error.message : "Gagal memperbarui user.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID user wajib diisi." }, { status: 400 });
  if (!canManageUsers(session.user.role)) return forbidden();

  if (id === session.user.id) {
    return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.asset.updateMany({ where: { responsibleUserId: id }, data: { responsibleUserId: null } }),
      prisma.asset.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.assetLifecycleLog.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.assetMutation.updateMany({ where: { oldResponsibleUserId: id }, data: { oldResponsibleUserId: null } }),
      prisma.assetMutation.updateMany({ where: { newResponsibleUserId: id }, data: { newResponsibleUserId: null } }),
      prisma.assetMutation.updateMany({ where: { approvedById: id }, data: { approvedById: null } }),
      prisma.assetMutation.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.serviceRecord.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.aiAssetRecommendation.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } }),
      prisma.aiAnalysisRun.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } })
    ]);

    await createAuditLog({
      session,
      action: "DELETE_USER",
      module: "Pengguna",
      description: `${user.email} dihapus dari sistem.`,
      ipAddress: requestIp(request)
    });

    return NextResponse.json({ success: true, message: "User berhasil dihapus." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus user karena terdapat data yang terikat kuat." },
      { status: 400 }
    );
  }
}

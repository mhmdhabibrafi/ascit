import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, requestIp } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isStrongPassword(value: unknown) {
  const password = String(value || "");
  // Minimal 8 karakter, harus ada huruf dan angka
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = await request.json();
    const userId = session.user.id;

    const data: Record<string, any> = {};
    if (body.name?.trim()) data.name = body.name.trim();
    if (body.email?.trim()) data.email = String(body.email).trim().toLowerCase();

    if (body.password) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Password lama wajib diisi untuk mengubah password." },
          { status: 400 }
        );
      }
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
      const validCurrent = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!validCurrent) {
        return NextResponse.json({ error: "Password lama tidak sesuai." }, { status: 400 });
      }
      if (!isStrongPassword(body.password)) {
        return NextResponse.json(
          { error: "Password minimal 8 karakter dan harus berisi huruf serta angka." },
          { status: 400 }
        );
      }
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    if (!data.name && !data.email && !data.passwordHash) {
      return NextResponse.json({ error: "Tidak ada data perubahan yang dikirim." }, { status: 400 });
    }

    // Periksa apakah email baru sudah digunakan oleh pengguna lain
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email sudah digunakan oleh pengguna lain." }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    await createAuditLog({
      session,
      action: "UPDATE_PROFILE",
      module: "Profil",
      description: `Profil pengguna ${updatedUser.email} berhasil diperbarui secara mandiri.`,
      ipAddress: requestIp(request)
    });

    return NextResponse.json({
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(5, Number(request.nextUrl.searchParams.get("limit")) || 20));
  const status = request.nextUrl.searchParams.get("status") || "all";
  const userId = session.user.id;
  const where = status === "unread"
    ? { notificationReads: { none: { userId } } }
    : status === "read"
      ? { notificationReads: { some: { userId } } }
      : {};

  const [rows, total, unreadCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        module: true,
        description: true,
        createdAt: true,
        user: { select: { name: true } },
        notificationReads: { where: { userId }, select: { readAt: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { notificationReads: { none: { userId } } } })
  ]);

  return NextResponse.json({
    data: rows.map(({ notificationReads, ...safeRow }) => ({
      ...safeRow,
      isRead: notificationReads.length > 0,
      readAt: notificationReads[0]?.readAt || null
    })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), unreadCount }
  });
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const userId = session.user.id;

  if (body.all === true) {
    const unread = await prisma.auditLog.findMany({
      where: { notificationReads: { none: { userId } } },
      select: { id: true }
    });
    if (unread.length) {
      await prisma.notificationRead.createMany({
        data: unread.map((row) => ({ userId, auditLogId: row.id })),
        skipDuplicates: true
      });
    }
    return NextResponse.json({ success: true, updated: unread.length });
  }

  const auditLogId = String(body.id || "");
  if (!auditLogId) return NextResponse.json({ error: "ID notifikasi wajib diisi." }, { status: 400 });
  const exists = await prisma.auditLog.findUnique({ where: { id: auditLogId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Notifikasi tidak ditemukan." }, { status: 404 });

  if (body.read === false) {
    await prisma.notificationRead.deleteMany({ where: { userId, auditLogId } });
  } else {
    await prisma.notificationRead.upsert({
      where: { userId_auditLogId: { userId, auditLogId } },
      create: { userId, auditLogId },
      update: { readAt: new Date() }
    });
  }
  return NextResponse.json({ success: true });
}

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  // ponytail: ensure user still exists in DB (handles orphaned sessions after db reset)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true, role: { select: { name: true } } }
  });
  if (!user?.isActive) {
    return { session: null, response: NextResponse.json({ error: "Sesi tidak valid, harap login kembali." }, { status: 401 }) };
  }
  // Always authorize against current database state, not a potentially stale JWT role.
  session.user.role = user.role.name;
  return { session, response: null };
}

export async function validateRoomInUnit(roomId: string, unitId: string) {
  const room = await prisma.room.findFirst({ where: { id: roomId, unitId }, select: { id: true } });
  return Boolean(room);
}

export function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function hasAnyRole(role: string | undefined, allowed: string[]) {
  return Boolean(role && allowed.includes(role));
}

export function parseDateInput(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

import { NextResponse } from "next/server";
import { forbidden, hasAnyRole, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const auditReadRoles = ["SUPER_ADMIN", "ADMIN_IT", "KEPALA_IT", "MANAJEMEN"];

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  if (!hasAnyRole(session.user.role, auditReadRoles)) return forbidden();

  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: { name: true, email: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  return NextResponse.json({ data: logs });
}

import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  session?: Session | null;
  action: string;
  module: string;
  description: string;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.session?.user?.id,
      action: input.action,
      module: input.module,
      description: input.description,
      ipAddress: input.ipAddress ?? undefined
    }
  });
}

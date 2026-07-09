import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserRole(userId: string): Promise<Role | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role ?? null;
}

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AI_SYSTEM_USER_ID } from "@/lib/constants";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { UserManagement } from "./UserManagement";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");

  const users = await prisma.user.findMany({
    where: { id: { not: AI_SYSTEM_USER_ID } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      specialty: true,
      isActive: true,
      mustChangePassword: true,
      authProvider: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8">
      <h1 className="text-xl font-semibold">จัดการบัญชีผู้ใช้</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">
        เฉพาะ Admin เท่านั้นที่สร้างบัญชีผู้ใช้และเจ้าหน้าที่ได้ บัญชี Admin เพิ่มเติมควรสร้างผ่านขั้นตอน bootstrap ที่ควบคุมโดยผู้ดูแลระบบ
      </p>
      <UserManagement users={users} />
    </main>
  );
}

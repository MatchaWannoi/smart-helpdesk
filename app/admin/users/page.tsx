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

  const activeUsers = users.filter((user) => user.isActive).length;
  const staffUsers = users.filter((user) => user.role === Role.STAFF).length;

  return (
    <main className="admin-tool-page admin-users-page">
      <div className="tool-heading">
        <div>
          <span>USER MANAGEMENT</span>
          <h1>จัดการบัญชีผู้ใช้</h1>
          <p>สร้างบัญชีใหม่ กำหนดบทบาท และควบคุมการเข้าใช้งานระบบ</p>
        </div>
      </div>

      <section className="user-summary-grid" aria-label="ภาพรวมบัญชีผู้ใช้">
        <article><span>บัญชีทั้งหมด</span><strong>{users.length}</strong><small>ไม่รวมบัญชีระบบ AI</small></article>
        <article><span>กำลังใช้งาน</span><strong>{activeUsers}</strong><small>บัญชีที่เข้าสู่ระบบได้</small></article>
        <article><span>เจ้าหน้าที่</span><strong>{staffUsers}</strong><small>ทีม IT Support</small></article>
      </section>
      <UserManagement users={users} />
    </main>
  );
}

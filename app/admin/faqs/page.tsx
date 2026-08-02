import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { FAQManagement } from "./FAQManagement";

export default async function AdminFaqPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");
  const faqs = await prisma.fAQ.findMany({ orderBy: { updatedAt: "desc" } });
  return <main className="admin-tool-page"><div className="tool-heading"><span>KNOWLEDGE BASE</span><h1>จัดการ FAQ</h1><p>เพิ่มและปรับปรุงฐานความรู้ที่ AI ใช้วิเคราะห์ปัญหา</p></div><FAQManagement faqs={faqs} /></main>;
}

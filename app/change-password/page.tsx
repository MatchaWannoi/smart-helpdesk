import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-2 text-sm text-zinc-500">
        บัญชีนี้ใช้รหัสผ่านชั่วคราวที่ผู้ดูแลระบบออกให้ กรุณาตั้งรหัสผ่านส่วนตัวก่อนใช้งาน Helpdesk
      </p>
      <ChangePasswordForm />
    </main>
  );
}

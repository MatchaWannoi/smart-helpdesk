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
      <section className="password-card">
        <span className="password-symbol">⌁</span>
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h1 className="text-xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm text-zinc-500">
          เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านส่วนตัวก่อนใช้งาน Helpdesk
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}

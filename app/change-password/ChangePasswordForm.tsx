"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmAction = useConfirmDialog();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (!(await confirmAction({
      title: "เปลี่ยนรหัสผ่านหรือไม่?",
      description: "หลังบันทึกรหัสผ่านใหม่ ระบบจะนำคุณออกจากระบบและให้เข้าสู่ระบบอีกครั้ง",
      confirmLabel: "เปลี่ยนรหัสผ่าน",
    }))) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      }

      await signOut({ callbackUrl: "/login?password=changed" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {submitting && (
        <PageTransitionPopup
          title="กำลังเปลี่ยนรหัสผ่าน..."
          description="กรุณารอสักครู่ ระบบกำลังบันทึกและพาคุณเข้าสู่หน้า Login"
          portalToBody
        />
      )}
      <label className="flex flex-col gap-1 text-sm">
        รหัสผ่านปัจจุบัน
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          autoComplete="current-password"
          className="border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        รหัสผ่านใหม่
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <span className="text-xs text-zinc-500">อย่างน้อย 8 ตัว และมีทั้งตัวอักษรกับตัวเลข</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        ยืนยันรหัสผ่านใหม่
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}

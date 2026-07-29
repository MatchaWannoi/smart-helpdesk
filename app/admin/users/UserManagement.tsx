"use client";

import type { Category, Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty: Category | null;
  isActive: boolean;
  mustChangePassword: boolean;
  authProvider: string;
};

type CredentialNotice = { email: string; password: string } | null;

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "เครือข่าย",
  HARDWARE: "ฮาร์ดแวร์",
  SOFTWARE: "ซอฟต์แวร์",
  ACCOUNT: "บัญชีผู้ใช้",
};

export function UserManagement({ users }: { users: ManagedUser[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"USER" | "STAFF">("USER");
  const [specialty, setSpecialty] = useState<Category>("NETWORK");
  const [notice, setNotice] = useState<CredentialNotice>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, specialty: role === "STAFF" ? specialty : null }),
      });
      const data = (await response.json()) as { error?: string; temporaryPassword?: string };
      if (!response.ok || !data.temporaryPassword) {
        throw new Error(data.error ?? "สร้างบัญชีไม่สำเร็จ");
      }

      setNotice({ email: email.trim().toLowerCase(), password: data.temporaryPassword });
      setName("");
      setEmail("");
      setRole("USER");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateUser(user: ManagedUser, action: "setActive" | "resetPassword") {
    setBusyId(user.id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "setActive"
            ? { action, active: !user.isActive }
            : { action },
        ),
      });
      const data = (await response.json()) as { error?: string; temporaryPassword?: string };
      if (!response.ok) throw new Error(data.error ?? "อัปเดตบัญชีไม่สำเร็จ");

      if (data.temporaryPassword) {
        setNotice({ email: user.email, password: data.temporaryPassword });
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตบัญชีไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
      <section>
        <h2 className="font-medium">สร้างบัญชีใหม่</h2>
        <p className="mt-1 text-xs text-zinc-500">
          ระบบจะสร้างรหัสผ่านชั่วคราวและบังคับให้ผู้ใช้เปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก
        </p>
        <form onSubmit={createUser} className="mt-4 flex flex-col gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ชื่อ-นามสกุล"
            required
            minLength={2}
            className="border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="อีเมลองค์กร"
            required
            className="border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "USER" | "STAFF")}
            className="border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="USER">ผู้ใช้งานทั่วไป</option>
            <option value="STAFF">เจ้าหน้าที่ IT Support</option>
          </select>
          {role === "STAFF" && (
            <select
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value as Category)}
              className="border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "กำลังสร้าง..." : "สร้างบัญชี"}
          </button>
        </form>

        {notice && (
          <div className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">คัดลอกข้อมูลนี้ก่อนปิดหน้าหรือทำรายการอื่น</p>
            <p className="mt-2">อีเมล: <code>{notice.email}</code></p>
            <p>รหัสผ่านชั่วคราว: <code className="font-bold">{notice.password}</code></p>
            <p className="mt-2 text-xs">ระบบไม่เก็บรหัสผ่านนี้ในรูปแบบที่เปิดดูย้อนหลังได้</p>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      </section>

      <section className="min-w-0">
        <h2 className="font-medium">บัญชีในระบบ</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr><th className="p-2">ผู้ใช้</th><th className="p-2">บทบาท</th><th className="p-2">สถานะ</th><th className="p-2">การดำเนินการ</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="p-2"><p className="font-medium">{user.name}</p><p className="text-xs text-zinc-500">{user.email}</p></td>
                  <td className="p-2"><p>{user.role}</p>{user.specialty && <p className="text-xs text-zinc-500">{CATEGORY_LABEL[user.specialty]}</p>}</td>
                  <td className="p-2">
                    <span className={user.isActive ? "text-green-700" : "text-zinc-500"}>{user.isActive ? "ใช้งาน" : "ระงับ"}</span>
                    {user.mustChangePassword && <p className="text-xs text-amber-700">รอเปลี่ยนรหัสผ่าน</p>}
                  </td>
                  <td className="p-2">
                    {user.role === "ADMIN" ? (
                      <span className="text-xs text-zinc-500">จัดการผ่าน bootstrap</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busyId === user.id} onClick={() => void updateUser(user, "resetPassword")} className="border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700">รีเซ็ตรหัสผ่าน</button>
                        <button type="button" disabled={busyId === user.id} onClick={() => void updateUser(user, "setActive")} className="border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700">{user.isActive ? "ระงับบัญชี" : "เปิดใช้งาน"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

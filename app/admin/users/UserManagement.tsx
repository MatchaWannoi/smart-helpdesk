"use client";

import type { Category, Role } from "@prisma/client";
import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useRenderedOperation } from "@/hooks/useRenderedOperation";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"USER" | "STAFF">("USER");
  const [specialty, setSpecialty] = useState<Category>("NETWORK");
  const [notice, setNotice] = useState<CredentialNotice>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirmDialog();
  const { operation, isWorking, begin, cancel, finishWithRefresh } = useRenderedOperation();

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await confirmAction({
      title: "ยืนยันการสร้างบัญชี",
      description: `ระบบจะสร้างบัญชีสำหรับ ${email.trim().toLowerCase()} และออกรหัสผ่านเริ่มต้นให้`,
      confirmLabel: "สร้างบัญชี",
    }))) return;
    setError(null);
    setNotice(null);
    begin({
      title: "กำลังสร้างบัญชีผู้ใช้งาน...",
      description: "กรุณารอสักครู่ ระบบกำลังสร้างบัญชีและแสดงรายการล่าสุด",
    });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
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
      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างบัญชีไม่สำเร็จ");
      cancel();
    }
  }

  async function updateUser(user: ManagedUser, action: "setActive" | "resetPassword") {
    const confirmation = action === "resetPassword"
      ? `ยืนยันการรีเซ็ตรหัสผ่านของ ${user.name} ใช่หรือไม่?`
      : user.isActive
        ? `ยืนยันการระงับบัญชี ${user.name} ใช่หรือไม่?`
        : `ยืนยันการเปิดใช้งานบัญชี ${user.name} ใช่หรือไม่?`;
    if (!(await confirmAction({
      title: action === "resetPassword" ? "รีเซ็ตรหัสผ่านหรือไม่?" : user.isActive ? "ระงับบัญชีหรือไม่?" : "เปิดใช้งานบัญชีหรือไม่?",
      description: confirmation,
      confirmLabel: action === "resetPassword" ? "รีเซ็ตรหัสผ่าน" : user.isActive ? "ระงับบัญชี" : "เปิดใช้งาน",
      variant: action === "setActive" && user.isActive ? "danger" : "default",
    }))) return;

    setError(null);
    setNotice(null);
    begin({
      title: action === "resetPassword"
        ? "กำลังรีเซ็ตรหัสผ่าน..."
        : user.isActive
          ? "กำลังระงับบัญชีผู้ใช้งาน..."
          : "กำลังเปิดใช้งานบัญชี...",
      description: "กรุณารอสักครู่ ระบบกำลังบันทึกและแสดงข้อมูลล่าสุด",
    });

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
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
      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตบัญชีไม่สำเร็จ");
      cancel();
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (!(await confirmAction({
      title: "ลบบัญชีอย่างถาวรหรือไม่?",
      description: `${user.name} (${user.email}) จะไม่สามารถเข้าสู่ระบบได้อีก และการลบไม่สามารถย้อนกลับได้`,
      confirmLabel: "ลบบัญชี",
      variant: "danger",
    }))) return;

    setError(null);
    setNotice(null);
    begin({
      title: "กำลังลบบัญชีผู้ใช้งาน...",
      description: "กรุณารอสักครู่ ระบบกำลังลบและแสดงรายการล่าสุด",
    });

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "X-Skip-Global-Activity": "true" },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ลบบัญชีไม่สำเร็จ");
      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ลบบัญชีไม่สำเร็จ");
      cancel();
    }
  }

  return (
    <>
      {operation && <PageTransitionPopup {...operation} portalToBody />}
      <div className="user-management-grid">
      <section className="managed-panel user-create-panel">
        <div className="managed-panel-heading">
          <span>NEW ACCOUNT</span>
          <h2>สร้างบัญชีใหม่</h2>
          <p>ระบบจะออกรหัสผ่านชั่วคราว และให้ผู้ใช้ตั้งรหัสผ่านส่วนตัวเมื่อเข้าสู่ระบบครั้งแรก</p>
        </div>

        <form onSubmit={createUser} className="managed-form">
          <label>
            ชื่อ-นามสกุล
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              required
              minLength={2}
            />
          </label>
          <label>
            อีเมลองค์กร
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
            />
          </label>
          <label>
            บทบาท
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "USER" | "STAFF")}
            >
              <option value="USER">ผู้ใช้งานทั่วไป</option>
              <option value="STAFF">เจ้าหน้าที่ IT Support</option>
            </select>
          </label>
          {role === "STAFF" && (
            <label>
              ความเชี่ยวชาญ
              <select
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value as Category)}
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" disabled={isWorking} className="managed-primary">
            {isWorking ? "กำลังดำเนินการ..." : "+ สร้างบัญชี"}
          </button>
        </form>

        {notice && (
          <div className="credential-notice">
            <p><strong>คัดลอกข้อมูลนี้ก่อนทำรายการอื่น</strong></p>
            <p>อีเมล: <code>{notice.email}</code></p>
            <p>รหัสผ่านชั่วคราว: <code><strong>{notice.password}</strong></code></p>
            <p>ระบบไม่สามารถเปิดดูรหัสผ่านนี้ย้อนหลังได้</p>
          </div>
        )}
        {error && <p className="managed-error" role="alert">{error}</p>}
      </section>

      <section className="managed-panel user-list-panel">
        <div className="managed-panel-title-row">
          <h2>บัญชีในระบบ</h2>
          <span>{users.length} บัญชี</span>
        </div>
        <div className="managed-table-wrap">
          <table className="managed-users-table">
            <thead>
              <tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="managed-user-cell">
                      <span className="managed-user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                      <div><p>{user.name}</p><small>{user.email}</small></div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-pill role-${user.role.toLowerCase()}`}>{user.role}</span>
                    {user.specialty && <small className="password-pending">{CATEGORY_LABEL[user.specialty]}</small>}
                  </td>
                  <td>
                    <span className={`account-state${user.isActive ? "" : " inactive"}`}>{user.isActive ? "ใช้งาน" : "ระงับ"}</span>
                    {user.mustChangePassword && <small className="password-pending">รอเปลี่ยนรหัสผ่าน</small>}
                  </td>
                  <td>
                    {user.role === "ADMIN" ? (
                      <span className="bootstrap-note">จัดการผ่าน bootstrap</span>
                    ) : (
                      <div className="managed-actions">
                        <button type="button" disabled={isWorking} onClick={() => void updateUser(user, "resetPassword")} className="managed-action">รีเซ็ตรหัสผ่าน</button>
                        <button type="button" disabled={isWorking} onClick={() => void updateUser(user, "setActive")} className={`managed-action${user.isActive ? " danger" : ""}`}>{user.isActive ? "ระงับบัญชี" : "เปิดใช้งาน"}</button>
                        <button type="button" disabled={isWorking} onClick={() => void deleteUser(user)} className="managed-action danger">ลบบัญชี</button>
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
    </>
  );
}

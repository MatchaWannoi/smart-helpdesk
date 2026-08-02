"use client";

import type { Category } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface StaffOption {
  id: string;
  name: string;
  specialty: Category | null;
}

interface AssignStaffFormProps {
  ticketId: string;
  staffList: StaffOption[];
  currentStaffId: string | null;
  suggestedCategory: Category | null;
  isLocked?: boolean;
}

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "เครือข่าย",
  HARDWARE: "ฮาร์ดแวร์",
  SOFTWARE: "ซอฟต์แวร์",
  ACCOUNT: "บัญชีผู้ใช้",
};

export function AssignStaffForm({
  ticketId,
  staffList,
  currentStaffId,
  suggestedCategory,
  isLocked = false,
}: AssignStaffFormProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(currentStaffId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLocked) {
    return (
      <div className="assignment-locked"><span>i</span>คำร้องนี้แก้ไขหรือปิดแล้ว จึงไม่สามารถเปลี่ยนเจ้าหน้าที่ได้</div>
    );
  }

  async function handleAssign() {
    if (!staffId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Assignment failed");
      }

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="assign-staff-form">
      <select
        value={staffId}
        onChange={(event) => setStaffId(event.target.value)}
        className="assign-staff-select"
      >
        <option value="">เลือกเจ้าหน้าที่...</option>
        {staffList.map((staff) => {
          const isSuggested =
            !!staff.specialty && staff.specialty === suggestedCategory;

          return (
            <option key={staff.id} value={staff.id}>
              {staff.name}
              {staff.specialty ? ` (${CATEGORY_LABEL[staff.specialty]})` : ""}
              {isSuggested ? " — ตรงกับหมวดหมู่" : ""}
            </option>
          );
        })}
      </select>

      <button
        type="button"
        onClick={() => void handleAssign()}
        disabled={isSubmitting || !staffId}
        className="assign-staff-button"
      >
        {isSubmitting
          ? "กำลังบันทึก..."
          : currentStaffId
            ? "เปลี่ยนเจ้าหน้าที่"
            : "มอบหมาย"}
      </button>

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

"use client";

import type { Category } from "@prisma/client";
import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useRenderedOperation } from "@/hooks/useRenderedOperation";

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
  const [staffId, setStaffId] = useState(currentStaffId ?? "");
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirmDialog();
  const { operation, isWorking, begin, cancel, finishWithRefresh } = useRenderedOperation();

  if (isLocked) {
    return (
      <div className="assignment-locked"><span>i</span>คำร้องนี้แก้ไขหรือปิดแล้ว จึงไม่สามารถเปลี่ยนเจ้าหน้าที่ได้</div>
    );
  }

  async function handleAssign() {
    if (!staffId) {
      return;
    }
    const selectedStaff = staffList.find((staff) => staff.id === staffId);
    if (!(await confirmAction({
      title: currentStaffId ? "เปลี่ยนเจ้าหน้าที่รับผิดชอบหรือไม่?" : "มอบหมายงานนี้หรือไม่?",
      description: `คำร้องนี้จะถูกมอบหมายให้ ${selectedStaff?.name ?? "เจ้าหน้าที่ที่เลือก"}`,
      confirmLabel: currentStaffId ? "เปลี่ยนเจ้าหน้าที่" : "มอบหมายงาน",
    }))) return;

    setError(null);
    begin({
      title: currentStaffId ? "กำลังเปลี่ยนเจ้าหน้าที่..." : "กำลังมอบหมายงานให้เจ้าหน้าที่...",
      description: "กรุณารอสักครู่ ระบบกำลังบันทึกและแสดงข้อมูลล่าสุด",
    });

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Skip-Global-Activity": "true",
        },
        body: JSON.stringify({ staffId }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Assignment failed");
      }

      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assignment failed");
      cancel();
    }
  }

  return (
    <div className="assign-staff-form">
      {operation && (
        <PageTransitionPopup
          {...operation}
          portalToBody
        />
      )}
      <select
        value={staffId}
        onChange={(event) => setStaffId(event.target.value)}
        className="assign-staff-select"
        disabled={isWorking}
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
        disabled={isWorking || !staffId}
        className="assign-staff-button"
      >
        {isWorking
          ? "กำลังมอบหมายงาน..."
          : currentStaffId
            ? "เปลี่ยนเจ้าหน้าที่"
            : "มอบหมาย"}
      </button>

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

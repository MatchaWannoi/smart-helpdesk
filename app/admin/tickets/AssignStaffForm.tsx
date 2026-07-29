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
  NETWORK: "Network",
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  ACCOUNT: "Account",
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
      <p className="text-xs text-zinc-500">
        This ticket is resolved or closed, so staff assignment is locked.
      </p>
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
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={staffId}
        onChange={(event) => setStaffId(event.target.value)}
        className="min-w-48 border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <option value="">Select staff...</option>
        {staffList.map((staff) => {
          const isSuggested =
            !!staff.specialty && staff.specialty === suggestedCategory;

          return (
            <option key={staff.id} value={staff.id}>
              {staff.name}
              {staff.specialty ? ` (${CATEGORY_LABEL[staff.specialty]})` : ""}
              {isSuggested ? " - category match" : ""}
            </option>
          );
        })}
      </select>

      <button
        type="button"
        onClick={() => void handleAssign()}
        disabled={isSubmitting || !staffId}
        className="bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Assigning..."
          : currentStaffId
            ? "Change staff"
            : "Assign"}
      </button>

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

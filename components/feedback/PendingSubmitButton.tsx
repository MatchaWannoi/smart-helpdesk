"use client";

import { useFormStatus } from "react-dom";
import { PageTransitionPopup } from "./PageTransitionPopup";

interface PendingSubmitButtonProps {
  className: string;
  label: string;
  children: React.ReactNode;
  title?: string;
}

export function PendingSubmitButton({ className, label, children, title }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        className={className}
        type="submit"
        title={title}
        aria-label={label}
        disabled={pending}
      >
        {pending ? <span className="button-spinner" aria-hidden="true" /> : children}
      </button>
      {pending && (
        <PageTransitionPopup
          title={label}
          description="กรุณารอสักครู่ ระบบกำลังเตรียมหน้าถัดไป"
          portalToBody
        />
      )}
    </>
  );
}

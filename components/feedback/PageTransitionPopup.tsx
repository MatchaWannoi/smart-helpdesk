"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface PageTransitionPopupProps {
  title?: string;
  description?: string;
  portalToBody?: boolean;
}

export function PageTransitionPopup({
  title = "กำลังเปลี่ยนหน้า...",
  description = "กรุณารอสักครู่ ระบบกำลังโหลดข้อมูล",
  portalToBody = false,
}: PageTransitionPopupProps = {}) {
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const popup = (
    <div className="page-transition-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="page-transition-popup">
        <span className="page-loading-spinner" aria-hidden="true" />
        <span className="page-transition-copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="page-transition-progress" aria-hidden="true"><i /></span>
      </div>
    </div>
  );

  if (!portalToBody) return popup;
  if (!isMounted) return null;
  return createPortal(popup, document.body);
}

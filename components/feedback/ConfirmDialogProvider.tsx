"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

type ConfirmDialogFunction = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmDialogFunction | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const canUsePortal = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback<ConfirmDialogFunction>((options) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  useEffect(() => {
    if (!request) return;

    confirmButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [request, close]);

  const dialog = request ? (
        <div
          className="confirm-dialog-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(25, 18, 43, 0.52)",
            backdropFilter: "blur(5px)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            className={`confirm-dialog${request.variant === "danger" ? " is-danger" : ""}`}
            style={{
              width: "min(440px, 100%)",
              border: "1px solid rgba(108, 79, 177, 0.2)",
              borderRadius: 22,
              padding: 28,
              background: "#fff",
              boxShadow: "0 26px 80px rgba(39, 24, 72, 0.3)",
              color: "#292333",
            }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            <span className="confirm-dialog-icon" aria-hidden="true">
              {request.variant === "danger" ? "!" : "✓"}
            </span>
            <div className="confirm-dialog-copy">
              <span className="confirm-dialog-kicker">CONFIRM ACTION</span>
              <h2 id="confirm-dialog-title">{request.title}</h2>
              <p id="confirm-dialog-description">{request.description}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button type="button" className="confirm-dialog-cancel" onClick={() => close(false)}>
                {request.cancelLabel ?? "ยกเลิก"}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="confirm-dialog-submit"
                onClick={() => close(true)}
              >
                {request.confirmLabel ?? "ยืนยัน"}
              </button>
            </div>
          </section>
        </div>
  ) : null;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialog && canUsePortal ? createPortal(dialog, document.body) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) throw new Error("useConfirmDialog must be used inside ConfirmDialogProvider");
  return confirm;
}

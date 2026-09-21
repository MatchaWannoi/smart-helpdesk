"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 4000;

interface TicketStatusRefreshProps {
  ticketId?: string;
  endpoint?: string;
  initialSnapshot: string;
}

/** Refreshes server-rendered ticket data only after the API reports a change. */
export function TicketStatusRefresh({
  ticketId,
  endpoint,
  initialSnapshot,
}: TicketStatusRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let snapshot = initialSnapshot;
    let requestInFlight = false;

    const checkForChanges = async () => {
      if (requestInFlight || document.visibilityState !== "visible") return;
      requestInFlight = true;
      try {
        const requestEndpoint = endpoint ?? (ticketId ? `/api/tickets/${ticketId}` : "/api/tickets");
        const response = await fetch(requestEndpoint, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          ticket?: { status: string; assignedStaffId?: string | null; updatedAt?: string };
          tickets?: Array<{ id: string; status: string; assignedStaff?: { id: string } | null; updatedAt?: string }>;
        };
        const nextSnapshot = ticketId
          ? JSON.stringify(data.ticket && {
              status: data.ticket.status,
              assignedStaffId: data.ticket.assignedStaffId ?? null,
              updatedAt: data.ticket.updatedAt ?? null,
            })
          : JSON.stringify(
              (data.tickets ?? []).map((ticket) => [
                ticket.id,
                ticket.status,
                ticket.assignedStaff?.id ?? null,
                ticket.updatedAt ?? null,
              ]),
            );
        if (nextSnapshot !== snapshot) {
          snapshot = nextSnapshot;
          router.refresh();
        }
      } finally {
        requestInFlight = false;
      }
    };

    const timer = window.setInterval(() => void checkForChanges(), REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void checkForChanges();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endpoint, initialSnapshot, router, ticketId]);

  return null;
}

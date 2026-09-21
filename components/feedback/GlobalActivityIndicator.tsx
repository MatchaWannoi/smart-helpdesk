"use client";

import { useEffect, useRef, useState } from "react";
import { PageTransitionPopup } from "./PageTransitionPopup";

interface ActivityFeedback {
  title: string;
  description: string;
}

function getActivityFeedback(input: RequestInfo | URL): ActivityFeedback {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.includes("/evaluation")) return { title: "กำลังบันทึกคำยืนยัน...", description: "ระบบกำลังอัปเดตสถานะคำร้อง" };
  if (url.includes("/messages") && !url.includes("/resolve") && !url.includes("/escalate")) {
    return { title: "กำลังส่งข้อความ...", description: "ระบบกำลังบันทึกและแสดงข้อความล่าสุด" };
  }
  if (url.includes("/resolve")) return { title: "กำลังบันทึกว่าแก้ปัญหาแล้ว...", description: "ระบบกำลังอัปเดตผลการแก้ไข" };
  if (url.includes("/escalate")) return { title: "กำลังส่งเรื่องให้เจ้าหน้าที่...", description: "ระบบกำลังสร้างคำร้องและเตรียมข้อมูล" };
  if (url.includes("/staff/tickets/")) return { title: "กำลังอัปเดตงาน...", description: "ระบบกำลังบันทึกและแสดงข้อมูลล่าสุด" };
  return { title: "ระบบกำลังประมวลผล...", description: "กรุณารอสักครู่จนกว่าการทำงานจะเสร็จสิ้น" };
}

export function GlobalActivityIndicator() {
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const pendingCount = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method === "GET" || method === "HEAD") return originalFetch(input, init);

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (
        headers.get("X-Skip-Global-Activity") === "true" ||
        headers.has("Next-Action") ||
        url.includes("/api/auth/")
      ) {
        return originalFetch(input, init);
      }

      pendingCount.current += 1;
      setFeedback(getActivityFeedback(input));

      try {
        return await originalFetch(input, init);
      } finally {
        pendingCount.current = Math.max(0, pendingCount.current - 1);
        if (pendingCount.current === 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (pendingCount.current === 0) setFeedback(null);
            });
          });
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!feedback) return null;
  return <PageTransitionPopup {...feedback} portalToBody />;
}

"use client";

import { useEffect, useMemo, useState } from "react";

interface ResolutionTimeProps {
  startedAt: string;
  endedAt?: string | null;
  compact?: boolean;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} วัน ${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`;
  if (minutes > 0) return `${minutes} นาที ${seconds} วินาที`;
  return `${seconds} วินาที`;
}

export function ResolutionTime({ startedAt, endedAt, compact = false }: ResolutionTimeProps) {
  const [now, setNow] = useState(() =>
    endedAt ? new Date(endedAt).getTime() : new Date(startedAt).getTime(),
  );
  const start = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const end = useMemo(() => (endedAt ? new Date(endedAt).getTime() : null), [endedAt]);

  useEffect(() => {
    if (end !== null) return;
    const refresh = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(refresh);
      window.clearInterval(timer);
    };
  }, [end]);

  const value = formatDuration((end ?? now) - start);

  return (
    <span className={`resolution-time${end ? " is-complete" : " is-running"}${compact ? " is-compact" : ""}`}>
      <span className="resolution-time-dot" aria-hidden="true" />
      <span>{end ? "ใช้เวลาแก้ไข" : "กำลังดำเนินการมาแล้ว"}</span>
      <strong>{value}</strong>
    </span>
  );
}

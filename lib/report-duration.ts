const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Formats the elapsed time for an individual ticket without rounding it up.
 * Under one hour shows minutes and seconds; from one hour onward shows hours
 * and minutes, as requested for report detail rows.
 */
export function formatDetailedDuration(durationMs: number) {
  const elapsedSeconds = Math.max(0, Math.floor(durationMs / SECOND_MS));
  const hours = Math.floor(elapsedSeconds / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);

  if (hours >= 1) return `${hours} ชม. ${minutes} นาที`;

  const seconds = elapsedSeconds % 60;
  return `${minutes} นาที ${seconds} วินาที`;
}

/** Keeps the existing rounded presentation used by the average-resolution KPI. */
export function formatAverageDuration(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 24) return `${Math.max(1, Math.round(hours))} ชม.`;
  return `${(hours / 24).toFixed(1)} วัน`;
}

export { HOUR_MS };

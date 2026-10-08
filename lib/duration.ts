/** A time span as 1:05, or 2:03:09 past an hour. */
export function duration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Time left, roughly: "2 d 5 h", "5 h 12 min", "12 min". */
export function timeLeft(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) return `${days} d ${hours} h`;
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

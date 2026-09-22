/** Formats a seconds count as an M:SS countdown string, e.g. 65 -> "1:05". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

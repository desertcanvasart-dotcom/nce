/** "Data age" in the health panel (DASH-OPR-027): how long ago data last arrived, in plain words. */
export function ageInWords(isoInstant: string | null, now: number): string {
  if (!isoInstant) return "No data yet";
  const minutes = Math.max(0, Math.floor((now - Date.parse(isoInstant)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 && hours < 6 ? `${hours} h ${minutes % 60} min ago` : `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

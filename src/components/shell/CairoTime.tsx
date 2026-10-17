import { formatCairo } from "@/lib/time/cairo";

/** A machine-readable UTC instant shown in Cairo time (DATA-003). */
export function CairoTime({ value, time = true }: { value: Date | string; time?: boolean }) {
  const iso = (typeof value === "string" ? new Date(value) : value).toISOString();
  return <time dateTime={iso}>{formatCairo(value, { time })}</time>;
}

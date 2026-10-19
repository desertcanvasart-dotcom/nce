import { formatCairo, formatCairoEndOfDay } from "@/lib/time/cairo";

/** A machine-readable UTC instant shown in Cairo time (DATA-003); `endOfDay` for a deadline at Cairo midnight. */
export function CairoTime({
  value,
  time = true,
  endOfDay = false,
}: {
  value: Date | string;
  time?: boolean;
  endOfDay?: boolean;
}) {
  const iso = (typeof value === "string" ? new Date(value) : value).toISOString();
  return <time dateTime={iso}>{endOfDay ? formatCairoEndOfDay(value) : formatCairo(value, { time })}</time>;
}

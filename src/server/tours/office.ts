import "server-only";
import { CAIRO } from "@/lib/time/cairo";
import { getDb } from "@/server/db";

/**
 * ADR-097: a tour office's bookings, by Cairo day and start. RLS shows the office only its own tours' orders, and
 * never payments. Cancelled orders stay listed (struck through) so the office sees what changed.
 */
export type OfficeOrder = {
  id: string;
  reference: string;
  status: "awaiting_payment" | "confirmed" | "cancelled";
  ages: number[];
  lead_name: string;
  notes: string | null;
  vehicle: string | null;
  cancelled_reason: string | null;
};
export type OfficeStart = {
  key: string;
  rateId: string | null;
  startsAt: string;
  tour: string;
  mode: string;
  label: string | null;
  guests: number;
  orders: OfficeOrder[];
};

export const cairoDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: CAIRO });

export async function officeBookings(fromDay: string, days = 14): Promise<{ day: string; starts: OfficeStart[] }[]> {
  const db = await getDb();
  // From Cairo midnight (Egypt is UTC+2 or +3; a day's margin either side, then filtered by Cairo day).
  const from = new Date(`${fromDay}T00:00:00Z`);
  const lo = new Date(from.getTime() - 86_400_000).toISOString();
  const hi = new Date(from.getTime() + (days + 1) * 86_400_000).toISOString();
  const { data, error } = await db
    .from("tour_orders")
    .select(
      "id, reference, status, ages, lead_name, notes, vehicle, label, mode, starts_at, rate_id, session_id, cancelled_reason, tour:tours(name)",
    )
    .gte("starts_at", lo)
    .lt("starts_at", hi)
    .neq("status", "awaiting_payment")
    .order("starts_at");
  if (error) throw error;
  const last = new Date(from.getTime() + (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const byDay = new Map<string, Map<string, OfficeStart>>();
  for (const o of data ?? []) {
    const day = cairoDay(o.starts_at);
    if (day < fromDay || day > last) continue;
    // One start: what office_cancel_slot cancels together (private parties at the same start each have their own guide).
    const key = `${o.rate_id ?? o.session_id}|${o.starts_at}`;
    const starts = byDay.get(day) ?? new Map<string, OfficeStart>();
    const s = starts.get(key) ?? {
      key,
      rateId: o.rate_id,
      startsAt: o.starts_at,
      tour: o.tour?.name ?? "Tour",
      mode: o.mode,
      label: o.label,
      guests: 0,
      orders: [],
    };
    if (o.status === "confirmed") s.guests += o.ages.length;
    s.orders.push({
      id: o.id,
      reference: o.reference,
      status: o.status,
      ages: o.ages,
      lead_name: o.lead_name,
      notes: o.notes,
      vehicle: o.vehicle,
      cancelled_reason: o.cancelled_reason,
    });
    starts.set(key, s);
    byDay.set(day, starts);
  }
  return [...byDay].map(([day, starts]) => ({ day, starts: [...starts.values()] }));
}

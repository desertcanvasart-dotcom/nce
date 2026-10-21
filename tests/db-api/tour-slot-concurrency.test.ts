/**
 * ADR-097: a shared tour start never takes more than 8 guests, even when many parties book it at the same moment.
 * Runs through the real API (PostgREST + Auth) against the local stack; builds its own sample tour and removes it after.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/server/db/database.types";

const CUSTOMER_PASSWORD = "Local-only-test-1";
const LUXOR_OFFICE = "00000000-0000-4000-b000-0000000000d1";
const RUN = Date.now();
const PARTIES = 10;
const PARTY = [40, 40, 9]; // three guests each: two parties fit in 8 places, a third doesn't

let url = "";
let anonKey = "";
let service: SupabaseClient<Database>;
let tourId = "";
let rateId = "";
let starts = "";
const userIds: string[] = [];
const customers: SupabaseClient<Database>[] = [];

beforeAll(async () => {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
  url = status.API_URL!;
  anonKey = status.ANON_KEY!;
  service = createClient<Database>(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: t, error } = await service
    .from("tours")
    .insert({
      slug: `sample-slot-race-${RUN}`,
      kind: "excursion",
      name: `Sample Slot Race ${RUN}`,
      location: "Luxor",
      duration_minutes: 240,
      office_id: LUXOR_OFFICE,
      visibility: "published",
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  tourId = t.id;
  const { data: r, error: re } = await service
    .from("tour_rates")
    .insert({ tour_id: tourId, mode: "shared", start_times: ["08:00"], prices: { adult: 5000, child611: 2500, child35: 0 } })
    .select("id")
    .single();
  if (re) throw re;
  rateId = r.id;
  // 08:00 Cairo, 5 days out (inside the 7-day booking window; winter or summer time alike).
  const day = new Date(Date.now() + 5 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const { cairoInstant } = await import("@/lib/tours/calendar");
  starts = cairoInstant(day, "08:00");
  for (let i = 0; i < PARTIES; i++) {
    const email = `slot-race-${RUN}-${i}@example.test`;
    const { data: u, error: ue } = await service.auth.admin.createUser({
      email,
      password: CUSTOMER_PASSWORD,
      email_confirm: true,
    });
    if (ue) throw ue;
    userIds.push(u.user.id);
    const c = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const { error: se } = await c.auth.signInWithPassword({ email, password: CUSTOMER_PASSWORD });
    if (se) throw se;
    customers.push(c);
  }
}, 120_000);

afterAll(async () => {
  if (!service) return;
  await service.from("notifications").delete().in("user_id", userIds);
  await service.from("tour_orders").delete().eq("tour_id", tourId);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
  await service.from("tours").delete().eq("id", tourId);
}, 60_000);

describe("shared tour starts under concurrency (ADR-097)", () => {
  it(`${PARTIES} parties of ${PARTY.length} booking one start at once fill it to 6 of 8, never more`, async () => {
    const results = await Promise.all(
      customers.map((c, i) =>
        c.rpc("order_tour_slot", {
          rate: rateId,
          starts,
          guest_ages: PARTY,
          lead: `Sample Party ${i}`,
          order_notes: "",
          terms_read: true,
        }),
      ),
    );
    const ok = results.filter((r) => !r.error);
    const refused = results.filter((r) => r.error);
    expect(ok).toHaveLength(2);
    // Plain refusals ("Only 2 places left"), never a deadlock or serialization failure.
    for (const r of refused) expect(r.error!.code).toBe("23514");
    const { data: orders } = await service.from("tour_orders").select("ages").eq("rate_id", rateId).eq("starts_at", starts);
    expect((orders ?? []).reduce((n, o) => n + o.ages.length, 0)).toBe(6);
  }, 60_000);
});

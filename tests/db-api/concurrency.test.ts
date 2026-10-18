/**
 * BATCH-PLAN 4e exit criterion, ADR-084: many customers accepting offers for the last cabins at the same moment
 * never take availability below zero. Runs through the real API (PostgREST + Auth) against the local stack.
 * It builds its own published sample sailing and removes everything afterwards, so other API tests see the seed only.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/server/db/database.types";

const PASSWORD = "nilecruz-local-only";
// Throwaway local accounts made by this test; the auth policy wants upper, lower and a digit.
const CUSTOMER_PASSWORD = "Local-only-test-1";
const ORG_A = "00000000-0000-4000-b000-00000000000a";
const RUN = Date.now();
const CUSTOMERS = 20;
const CABINS = 3;

let url = "";
let anonKey = "";
let service: SupabaseClient<Database>;
let vesselId = "";
let departureId = "";
let cabinTypeId = "";
const userIds: string[] = [];
const offerIds: string[] = [];
const requestIds: string[] = [];
const customers: SupabaseClient<Database>[] = [];
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function signedIn(email: string, password = PASSWORD) {
  const c = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

beforeAll(async () => {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
  url = status.API_URL!;
  anonKey = status.ANON_KEY!;
  service = createClient<Database>(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: v, error } = await service
    .from("vessels")
    .insert({
      slug: `sample-concurrency-${RUN}`,
      name: `Sample Concurrency Ship ${RUN}`,
      type: "motor",
      visibility: "published",
      published_at: new Date().toISOString(),
      operator_org_id: ORG_A,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  vesselId = v.id;
  const { data: c } = await service
    .from("cabin_types")
    .insert({ vessel_id: vesselId, code: "STD", name: "Standard", deck: "Main", max_occupancy: 2 })
    .select("id")
    .single();
  cabinTypeId = c!.id;
  const { data: s } = await service
    .from("schedules")
    .insert({
      vessel_id: vesselId,
      code: "C4",
      origin: "Concurrency Port",
      destination: "Test Harbour",
      nights: 4,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  const { data: d } = await service
    .from("departures")
    .insert({ schedule_id: s!.id, vessel_id: vesselId, departs_on: day(30), returns_on: day(34) })
    .select("id")
    .single();
  departureId = d!.id;
  await service
    .from("inventory")
    .insert({ departure_id: departureId, cabin_type_id: cabinTypeId, vessel_id: vesselId, available: CABINS });
  await service.from("rates").insert({
    departure_id: departureId,
    cabin_type_id: cabinTypeId,
    vessel_id: vesselId,
    occupancy: 2,
    rate_plan: "international",
    currency: "USD",
    amount_minor: 100000,
  });
  const { data: p } = await service
    .from("cancellation_policies")
    .insert({ vessel_id: vesselId, bands: [{ from_days: 0, percent: 100 }] })
    .select("id")
    .single();
  await service.from("cancellation_policy_translations").insert({ policy_id: p!.id, locale: "en", terms: "Sample policy." });

  // Twenty customers each ask; the operator answers each with an offer for one cabin.
  const operator = await signedIn("reservations@operator-a.test");
  for (let i = 0; i < CUSTOMERS; i++) {
    const email = `concurrency-${RUN}-${i}@example.test`;
    const { data: u, error: ue } = await service.auth.admin.createUser({
      email,
      password: CUSTOMER_PASSWORD,
      email_confirm: true,
    });
    if (ue) throw ue;
    userIds.push(u.user.id);
    const customer = await signedIn(email, CUSTOMER_PASSWORD);
    customers.push(customer);
    const { data: r, error: re } = await customer
      .from("cruise_requests")
      .insert({
        origin: "Concurrency Port",
        destination: "Test Harbour",
        earliest_departure: day(20),
        latest_departure: day(40),
        nights_min: 4,
        nights_max: 4,
        adults: 2,
        cabins: 1,
      })
      .select("id")
      .single();
    if (re) throw re;
    requestIds.push(r.id);
    const { data: offer, error: oe } = await operator.rpc("send_offer", {
      req: r.id,
      dep: departureId,
      plan: "international",
      cur: "USD",
      cabins: [{ cabin_type_id: cabinTypeId, adults: 2, child_ages: [], price_minor: 200000 }],
      total: 200000,
      list_total: 200000,
      note: "",
      inclusions_text: "",
      terms_text: "Sample terms.",
      eligibility: "Two adults.",
      expires_in_hours: 72,
    });
    if (oe) throw oe;
    offerIds.push(offer as string);
  }
}, 120_000);

afterAll(async () => {
  if (!service) return;
  const { data: made } = await service.from("reservations").select("id").eq("vessel_id", vesselId);
  for (const r of made ?? []) await service.from("notifications").delete().like("link", `%${r.id}%`);
  await service.from("reservations").delete().eq("vessel_id", vesselId);
  await service.from("offers").delete().eq("departure_id", departureId);
  for (const id of requestIds) await service.from("notifications").delete().like("link", `%${id}%`);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
  await service.from("vessels").delete().eq("id", vesselId);
}, 60_000);

describe("no oversell under concurrency (DASH-OPR-021, ADR-084)", () => {
  it(`${CUSTOMERS} simultaneous acceptances for ${CABINS} cabins make exactly ${CABINS} reservations`, async () => {
    const guests = [
      { full_name: "Sample Guest One", date_of_birth: "1980-01-01", nationality: "GB" },
      { full_name: "Sample Guest Two", date_of_birth: "1981-01-01" },
    ];
    const results = await Promise.all(
      customers.map((c, i) => c.rpc("accept_offer", { target: offerIds[i]!, guests, terms_read: true })),
    );
    const ok = results.filter((r) => !r.error);
    const refused = results.filter((r) => r.error);
    expect(ok).toHaveLength(CABINS);
    expect(refused).toHaveLength(CUSTOMERS - CABINS);
    // Refusals are plain answers ("not enough cabins", or "no cabins left" once the sailing is sold out),
    // never a deadlock (40P01), a serialization failure or a server error.
    for (const r of refused) expect(["23514", "22023"]).toContain(r.error!.code);
    for (const r of ok) expect(String(r.data)).toMatch(/^NC-[A-HJ-NP-Z2-9]{6}$/);

    const { data: inv } = await service.from("inventory").select("available").eq("departure_id", departureId).single();
    expect(inv!.available).toBe(0);
    const { count } = await service
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("departure_id", departureId);
    expect(count).toBe(CABINS);
  }, 60_000);
});

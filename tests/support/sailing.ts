import { createClient } from "@supabase/supabase-js";
import { cairoDate } from "@/lib/tours/tours";
import { adminDb, ORG } from "./local-auth";

/** A customer or operator signed in through the real API, to set up bookings quickly (the screens are tested separately). */
export async function apiAs(email: string, password: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

// Cairo calendar dates, as the app counts days (DATA-039): a UTC date is a day behind just after midnight in Cairo.
const isoIn = (days: number) => {
  const d = new Date(`${cairoDate(new Date())}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Operator A's own sample sailing, `departsIn` days out, with the given cancellation bands, and `count` reservations for
 * the customer at US$2,000 each (two adults, one double cabin).
 */
export async function sampleReservations(opts: {
  run: number | string;
  customer: { email: string; password: string };
  ownerEmail: string;
  bands: { from_days: number; percent: number }[];
  departsIn: number;
  count: number;
}) {
  const db = adminDb();
  const tag = `${opts.run}`;
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `sample-cancel-${tag}`,
      name: `Sample Cancel Ship ${tag}`,
      type: "motor",
      visibility: "published",
      published_at: new Date().toISOString(),
      operator_org_id: ORG.operatorA,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { data: c } = await db
    .from("cabin_types")
    .insert({ vessel_id: v.id, code: "DBL", name: "Double", deck: "Main", max_occupancy: 2 })
    .select("id")
    .single();
  const origin = `Cancel Port ${tag}`;
  const destination = `Cancel Harbour ${tag}`;
  const { data: s } = await db
    .from("schedules")
    .insert({ vessel_id: v.id, code: "CX4", origin, destination, nights: 4, sailing_days: [1, 2, 3, 4, 5, 6, 7] })
    .select("id")
    .single();
  const { data: d } = await db
    .from("departures")
    .insert({ schedule_id: s!.id, vessel_id: v.id, departs_on: isoIn(opts.departsIn), returns_on: isoIn(opts.departsIn + 4) })
    .select("id")
    .single();
  await db.from("inventory").insert({ departure_id: d!.id, cabin_type_id: c!.id, vessel_id: v.id, available: 5 });
  await db.from("rates").insert({
    departure_id: d!.id,
    cabin_type_id: c!.id,
    vessel_id: v.id,
    occupancy: 2,
    rate_plan: "international",
    currency: "USD",
    amount_minor: 100000,
  });
  const { data: p } = await db.from("cancellation_policies").insert({ vessel_id: v.id, bands: opts.bands }).select("id").single();
  await db
    .from("cancellation_policy_translations")
    .insert({ policy_id: p!.id, locale: "en", terms: "Sample policy wording for the cancellation tests." });

  const cust = await apiAs(opts.customer.email, opts.customer.password);
  const op = await apiAs(opts.ownerEmail, "nilecruz-local-only");
  const ids: string[] = [];
  const refs: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const { data: r, error: re } = await cust
      .from("cruise_requests")
      .insert({
        origin,
        destination,
        earliest_departure: isoIn(opts.departsIn - 10),
        latest_departure: isoIn(opts.departsIn + 10),
        nights_min: 4,
        nights_max: 4,
        adults: 2,
        cabins: 1,
      })
      .select("id")
      .single();
    if (re) throw re;
    const { data: offer, error: oe } = await op.rpc("send_offer", {
      req: r.id,
      dep: d!.id,
      plan: "international",
      cur: "USD",
      cabins: [{ cabin_type_id: c!.id, adults: 2, child_ages: [], price_minor: 200000 }],
      total: 200000,
      list_total: 200000,
      note: "",
      inclusions_text: "",
      terms_text: "Sample terms.",
      eligibility: "Two adults.",
      expires_in_hours: 72,
    });
    if (oe) throw oe;
    const guests = [
      { full_name: "Sample Payer One", date_of_birth: "1980-01-01", nationality: "GB" },
      { full_name: "Sample Payer Two", date_of_birth: "1981-01-01" },
    ];
    const { data: ref, error: ae } = await cust.rpc("accept_offer", { target: offer, guests, terms_read: true });
    if (ae) throw ae;
    refs.push(ref as string);
    ids.push((await db.from("reservations").select("id").eq("reference", ref).single()).data!.id);
  }
  return { ids, refs, departureId: d!.id, cabinTypeId: c!.id, vesselId: v.id as string };
}

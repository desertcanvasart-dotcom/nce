import Link from "next/link";
import { gratuityText } from "@/lib/product/pricing";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { formatMoney } from "@/components/ds/lib/format";
import { Checkboxes, Input, Notice, Section, ui } from "@/components/dashboard/ui";
import { groupSearch, parseChildAges, TIER_LABEL, type SearchRow } from "@/lib/partners/search";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { requireOrgRole } from "@/server/auth";
import { policyFor } from "@/server/bookings/queries";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { partnerRequestBooking, partnerReserve } from "../actions";

type Query = { dep?: string; cabin?: string; cur?: string; adults?: string; children?: string; cabins?: string };

/** DASH-B2B-003, 006: reserve cabins for a client at the agency's rate, naming every guest, with the client's reference. */
export default async function PartnerReserve({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Query>;
}) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    returnTo: `/dashboard/partner/${orgId}/search/`,
  });
  const q = await searchParams;
  if (!q.dep || !isUuid(q.dep) || !q.cabin || !isUuid(q.cabin) || (q.cur !== "USD" && q.cur !== "EUR")) notFound();
  const adults = Math.min(3, Math.max(1, Number(q.adults) || 2));
  const childAges = parseChildAges(q.children ?? "") ?? [];
  const cabins = Math.min(5, Math.max(1, Number(q.cabins) || 1));
  const db = await getDb();
  const { data: dep } = await db.from("departures").select("departs_on").eq("id", q.dep).maybeSingle();
  if (!dep) notFound();
  const { data: rows } = await db.rpc("partner_search", { org: orgId, from_day: dep.departs_on, to_day: dep.departs_on });
  const found = groupSearch(
    ((rows ?? []) as unknown as SearchRow[]).filter((r) => r.departure_id === q.dep),
    { adults, childAges },
  )[0];
  const cabin = found?.cabins.find((c) => c.cabinTypeId === q.cabin && c.currency === q.cur);
  const policy = await policyFor(q.dep);
  // ADR-100: cabins on manual or sheet data are confirmed by the operator before the agency pays.
  const requesting = cabin?.mode === "request";
  const { data: hours } =
    requesting && cabin ? await db.rpc("operator_confirm_hours", { target_org: cabin.operatorOrgId }) : { data: null };
  const most = requesting ? 5 : (cabin?.available ?? 0);
  const base = `/dashboard/partner/${orgId}/`;
  const ages = [...Array(adults).fill(30), ...childAges];
  const per = ages.length;
  const link = (n: number) =>
    `${base}reserve/?dep=${q.dep}&cabin=${q.cabin}&cur=${q.cur}&adults=${adults}&children=${encodeURIComponent(q.children ?? "")}&cabins=${n}`;
  return (
    <>
      <p>
        <Link
          href={`${base}search/?from=${dep.departs_on}&to=${dep.departs_on}&adults=${adults}&children=${encodeURIComponent(q.children ?? "")}`}
        >
          ← Search
        </Link>
      </p>
      <h1 className={ui.pageTitle}>Reserve for a client</h1>
      {!found || !cabin || !cabin.price.ok ? (
        <Notice tone="error">This cabin can no longer be booked at these dates for these guests. Search again.</Notice>
      ) : (
        <>
          <Section title={`${found.vessel} · ${found.route}, ${found.nights} nights`} id="sailing">
            <p>
              {found.departsOn} to {found.returnsOn} · {cabin.name}, {cabin.deck} deck ·{" "}
              {requesting
                ? `available, confirmed by the operator within ${Number(hours ?? 24)} h`
                : `${cabin.available} ${cabin.available === 1 ? "cabin" : "cabins"} to book now`}
            </p>
            <p>
              {cabins} {cabins === 1 ? "cabin" : "cabins"} ×{" "}
              {formatMoney({ amount: cabin.price.totalMinor, currency: cabin.currency }, "en")} ={" "}
              <strong>{formatMoney({ amount: cabin.price.totalMinor * cabins, currency: cabin.currency }, "en")}</strong>{" "}
              <span className={ui.muted}>({TIER_LABEL[cabin.price.tier]})</span>
            </p>
            {found.gratuityUsdMinor ? (
              <p className={ui.muted}>
                {gratuityText(found.gratuityUsdMinor, {
                  nights: found.nights,
                  ages: Array.from({ length: cabins }, () => [...Array<number>(adults).fill(30), ...childAges]).flat(),
                })}
              </p>
            ) : null}
            <p className={ui.muted}>
              Cabins with these guests:{" "}
              {[1, 2, 3, 4, 5]
                .filter((n) => n <= most)
                .map((n) =>
                  n === cabins ? (
                    <strong key={n}> {n} </strong>
                  ) : (
                    <Link key={n} href={link(n)}>
                      {" "}
                      {n}{" "}
                    </Link>
                  ),
                )}
            </p>
          </Section>
          <Section title="Cancellation policy" id="policy">
            {policy ? (
              <ul className={ui.list}>
                {bandLines(policy.bands as CancellationBand[], "departure").map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : null}
          </Section>
          <Section title="Guests and client" id="guests">
            <ActionForm
              action={(requesting ? partnerRequestBooking : partnerReserve).bind(null, orgId, {
                departureId: q.dep,
                cabinTypeId: q.cabin,
                currency: q.cur,
                cabins,
                ages: [...Array(adults).fill(30), ...childAges],
              })}
              submit={requesting ? "Send booking request" : "Reserve"}
            >
              {requesting ? (
                <Notice>
                  The operator confirms these cabins before you pay, usually within {Number(hours ?? 24)} hours. Nothing is
                  charged until then.
                </Notice>
              ) : null}
              <p className={ui.muted}>
                Full names as in passports and dates of birth for all {cabins * per} guests; ages on the departure date must
                match. The first guest is the lead passenger.
              </p>
              {Array.from({ length: cabins * per }, (_, i) => (
                <div key={i} className={ui.grid}>
                  <Input
                    label={`Cabin ${Math.floor(i / per) + 1}, guest ${(i % per) + 1}: full name`}
                    name={`name_${i}`}
                    required
                    maxLength={160}
                  />
                  <Input label="Date of birth" name={`dob_${i}`} type="date" required />
                  {i === 0 ? (
                    <Input label="Nationality" name="nationality" maxLength={2} hint="Two-letter code, for example ES." />
                  ) : null}
                </div>
              ))}
              <div className={ui.grid}>
                <Input label="Your client reference" name="client_reference" maxLength={120} hint="Only your agency sees it." />
                <Input
                  label={`Your selling price (${q.cur}, optional)`}
                  name="selling_total"
                  inputMode="decimal"
                  hint="What you charge your client. Only your agency sees it."
                />
              </div>
              <Checkboxes
                legend="Agreement"
                name="terms"
                options={[{ value: "yes", label: "The client has read the terms and the cancellation policy" }]}
                checked={[]}
              />
              <p className={ui.muted}>
                {requesting
                  ? `We send the request to the operator now. When they confirm, the booking is ${company.orgName}'s and payment is due by its deadline.`
                  : `Reserving checks the cabins are still free and holds them for ${company.orgName}. Payment is due by the deadline shown on the booking.`}
              </p>
            </ActionForm>
          </Section>
        </>
      )}
    </>
  );
}

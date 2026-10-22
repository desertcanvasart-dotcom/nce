import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { formatMoney } from "@/components/ds/lib/format";
import { getDb } from "@/server/db";
import { addStopSale, addSupplement, liftStopSale, setSupplementActive } from "./actions";

type Cabin = { id: string; name: string };
const cabinName = (cabins: Cabin[], id: string | null) =>
  id ? (cabins.find((c) => c.id === id)?.name ?? "A cabin type") : "All cabins";
const cabinOptions = (cabins: Cabin[]) => [
  { value: "", label: "All cabin types" },
  ...cabins.map((c) => ({ value: c.id, label: c.name })),
];

/**
 * ADR-103: a vessel's stop-sales and supplements, for its owners and reservations staff and for catalogue admins.
 * Stop-sales close departures (allotment cabins stay open; feeds and sheets don't lift them). Supplements are
 * compulsory charges per guest on the nights they cover, added to the fare.
 */
export async function SalesControls({ orgId, vesselId }: { orgId: string | null; vesselId: string }) {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: cabins }, { data: stops }, { data: supps }] = await Promise.all([
    db.from("cabin_types").select("id, name").eq("vessel_id", vesselId).eq("active", true).order("sort_order").order("name"),
    db
      .from("stop_sales")
      .select("id, cabin_type_id, starts_on, ends_on, reason")
      .eq("vessel_id", vesselId)
      .is("lifted_at", null)
      .gte("ends_on", today)
      .order("starts_on"),
    db
      .from("supplements")
      .select("id, cabin_type_id, kind, name, starts_on, ends_on, currency, amount_minor, active")
      .eq("vessel_id", vesselId)
      .gte("ends_on", today)
      .order("starts_on"),
  ]);
  const list = cabins ?? [];
  return (
    <>
      <Section title="Stop-sales" id="stop-sales">
        <p className={ui.muted}>
          Departures you can’t sell. They show as sold out and can’t be booked or requested. Cabins in a Nilecruz allotment stay
          open until their release date. A feed, the API or a vacancy sheet doesn’t lift a stop-sale; lift it here.
        </p>
        {stops?.length ? (
          <ul className={ui.list}>
            {stops.map((s) => (
              <li key={s.id} className={ui.actions}>
                <span>
                  <strong>{cabinName(list, s.cabin_type_id)}</strong> · departures {s.starts_on} to {s.ends_on}
                  {s.reason ? ` · ${s.reason}` : ""}
                </span>
                <ActionForm action={liftStopSale.bind(null, orgId, vesselId, s.id)} submit="Lift" variant="ghost">
                  {null}
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No stop-sales.</p>
        )}
        <ActionForm action={addStopSale.bind(null, orgId, vesselId)} submit="Stop sales" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Select label="Cabin type" name="cabin_type_id" options={cabinOptions(list)} />
            <Input label="Departures from" name="starts_on" type="date" required />
            <Input label="to" name="ends_on" type="date" required />
            <Input label="Reason (optional)" name="reason" maxLength={500} hint="For example “Charter” or “Dry dock”." />
          </div>
        </ActionForm>
      </Section>

      <Section title="Supplements" id="supplements">
        <p className={ui.muted}>
          Compulsory charges per guest, such as a gala dinner on 24 or 31 December, or peak dates. A sailing on board any of the
          nights pays it, in the cruise total; children pay the same share as of the fare. Bookings already made keep what they
          were charged.
        </p>
        {supps?.length ? (
          <ul className={ui.list}>
            {supps.map((s) => (
              <li key={s.id} className={ui.actions}>
                <span>
                  <strong>{s.name}</strong> ({s.kind === "gala_dinner" ? "gala dinner" : "peak dates"}) ·{" "}
                  {cabinName(list, s.cabin_type_id)} · nights {s.starts_on}
                  {s.ends_on !== s.starts_on ? ` to ${s.ends_on}` : ""} ·{" "}
                  {formatMoney({ amount: Number(s.amount_minor), currency: s.currency }, "en")} per guest
                  {s.active ? "" : " · switched off"}
                </span>
                <ActionForm
                  action={setSupplementActive.bind(null, orgId, vesselId, s.id, !s.active)}
                  submit={s.active ? "Switch off" : "Switch on"}
                  variant="ghost"
                >
                  {null}
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No supplements.</p>
        )}
        <ActionForm action={addSupplement.bind(null, orgId, vesselId)} submit="Add supplement" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Input label="Name" name="name" required maxLength={120} hint="For example “Christmas gala dinner”." />
            <Select
              label="Kind"
              name="kind"
              required
              options={[
                { value: "gala_dinner", label: "Gala dinner" },
                { value: "peak", label: "Peak dates" },
              ]}
            />
            <Select label="Cabin type" name="cabin_type_id" options={cabinOptions(list)} />
            <Input label="First night" name="starts_on" type="date" required />
            <Input label="Last night" name="ends_on" type="date" required hint="The same date for one night." />
            <Select
              label="Currency"
              name="currency"
              required
              options={[
                { value: "USD", label: "US$" },
                { value: "EUR", label: "€" },
                { value: "EGP", label: "E£" },
              ]}
              hint="Bookings in this currency pay it; add one per currency you price in."
            />
            <Input label="Per guest" name="amount" inputMode="decimal" required hint="For example 85 or 85.50." />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { dateWindow, nowMs, sailingDates, WEEKDAYS } from "@/lib/product/departures";
import { isFresh, RATE_PLANS } from "@/lib/product/pricing";
import { requireProductEditor } from "@/server/product/guard";
import { approvedPartners, cabinTypes, departureGrid, freshnessHours, schedule as getSchedule } from "@/server/product/queries";
import { getDb } from "@/server/db";
import {
  addPeriod,
  bulkUpdate,
  confirmAvailability,
  deletePartnerRate,
  deleteRate,
  generate,
  removePeriod,
  saveItineraryDay,
  saveSchedule,
  setDepartureStatus,
} from "./actions";
import { productPaths } from "./paths";
import { ScheduleFields } from "./SchedulesPage";

/** DASH-ADM-051–056: a schedule, its departures, availability and rates. */
export async function SchedulePage({
  orgId,
  vesselId,
  scheduleId,
  from,
}: {
  orgId: string | null;
  vesselId: string;
  scheduleId: string;
  from?: string;
}) {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const s = await getSchedule(scheduleId, vesselId);
  if (!s) notFound();
  const { today } = dateWindow(0);
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : today;
  const end = dateWindow(62, start).until;
  const [cabins, grid, hours, partners] = await Promise.all([
    cabinTypes(vesselId),
    departureGrid(scheduleId, start, end),
    freshnessHours(),
    approvedPartners(),
  ]);
  const active = cabins.filter((c) => c.active);
  const horizon = dateWindow(400).until;
  const now = nowMs();
  const planned = sailingDates(s.sailing_days, s.schedule_periods, today, horizon).length;
  const title = (n: number) => s.schedule_days.find((d) => d.day_number === n && d.locale === "en");

  return (
    <>
      <p>
        <Link href={p.schedules}>← Schedules · {vessel.name}</Link>
      </p>
      <h1 className={ui.pageTitle}>
        {s.origin} → {s.destination}, {s.nights} nights
      </h1>

      <Section title="Schedule" id="schedule">
        <ActionForm action={saveSchedule.bind(null, orgId, vesselId, scheduleId)} submit="Save schedule">
          <ScheduleFields value={s} />
        </ActionForm>
      </Section>

      <Section title="Operating periods" id="periods">
        {s.schedule_periods.length ? (
          <ul className={ui.list}>
            {[...s.schedule_periods]
              .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
              .map((x) => (
                <li key={x.id} className={ui.actions}>
                  <span>
                    {x.starts_on} to {x.ends_on}
                  </span>
                  <ActionForm
                    action={removePeriod.bind(null, orgId, vesselId, scheduleId, x.id)}
                    submit="Remove"
                    variant="ghost"
                  />
                </li>
              ))}
          </ul>
        ) : (
          <p className={ui.muted}>No periods yet: add the dates this schedule operates.</p>
        )}
        <ActionForm
          action={addPeriod.bind(null, orgId, vesselId, scheduleId)}
          submit="Add period"
          variant="outline"
          resetOnSuccess
        >
          <div className={ui.grid}>
            <Input label="From" name="starts_on" type="date" required />
            <Input label="To" name="ends_on" type="date" required />
          </div>
        </ActionForm>
        <ActionForm action={generate.bind(null, orgId, vesselId, scheduleId)} submit="Create departures">
          <p className={ui.hint}>
            {planned} sailing date{planned === 1 ? "" : "s"} in the next 400 days. Dates that already have a departure are left as
            they are.
          </p>
        </ActionForm>
      </Section>

      <Section title="Itinerary" id="itinerary">
        <ol className={ui.list}>
          {Array.from({ length: s.nights + 1 }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              <strong>Day {n}</strong>: {title(n)?.title ?? <span className={ui.muted}>not written yet</span>}
            </li>
          ))}
        </ol>
        <ActionForm action={saveItineraryDay.bind(null, orgId, vesselId, scheduleId)} submit="Save day" variant="outline">
          <div className={ui.grid}>
            <Select
              label="Day"
              name="day_number"
              required
              options={Array.from({ length: s.nights + 1 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))}
            />
            <Select
              label="Language"
              name="locale"
              defaultValue="en"
              options={[
                { value: "en", label: "English" },
                { value: "es", label: "Spanish" },
                { value: "ja", label: "Japanese" },
              ]}
            />
            <Input label="Title" name="title" required maxLength={160} hint="For example “Luxor: Karnak and Luxor temples”." />
          </div>
          <TextArea label="What happens that day" name="description" maxLength={4000} rows={3} />
        </ActionForm>
      </Section>

      <Section title="Availability and prices" id="rates">
        {!active.length ? <Notice>Add cabin types first.</Notice> : null}
        <p className={ui.muted}>
          Cabins available belong to the departure and cabin type: several prices or currencies never add cabins. Prices are per
          person in the chosen currency.
        </p>
        <ActionForm action={bulkUpdate.bind(null, orgId, vesselId, scheduleId)} submit="Apply to matching departures">
          <div className={ui.grid}>
            <Select
              label="Cabin type"
              name="cabin_type_id"
              required
              placeholder="Choose"
              options={active.map((c) => ({ value: c.id, label: `${c.name} (${c.deck})` }))}
            />
            <Input label="From" name="from" type="date" required defaultValue={start} />
            <Input label="To" name="to" type="date" required defaultValue={end} />
            <Input label="Cabins available" name="available" inputMode="numeric" hint="Leave empty to keep it." />
            <Select
              label="Occupancy"
              name="occupancy"
              defaultValue="2"
              options={[
                { value: "1", label: "Single" },
                { value: "2", label: "Double" },
                { value: "3", label: "Triple" },
              ]}
            />
            <Select label="Rate plan" name="rate_plan" defaultValue="international" options={RATE_PLANS} />
            <Select
              label="Only for one travel partner"
              name="partner"
              placeholder="All travel partners"
              options={partners.map((x) => ({ value: x.id, label: x.display_name }))}
              hint="With the Trade plan: a price only that agency sees."
            />
            <Select
              label="Currency"
              name="currency"
              defaultValue="USD"
              options={[
                { value: "USD", label: "US$" },
                { value: "EUR", label: "€" },
                { value: "EGP", label: "E£ (Egyptian citizen or resident plans)" },
              ]}
            />
            <Input label="Price per person" name="amount" inputMode="decimal" hint="Leave empty to keep it." />
          </div>
          <Checkboxes
            legend="Only these sailing days (none = all)"
            name="weekdays"
            options={WEEKDAYS.map((w) => ({ value: String(w.value), label: w.label }))}
            checked={[]}
          />
        </ActionForm>
        <ActionForm
          action={confirmAvailability.bind(null, orgId, vesselId, scheduleId)}
          submit="Confirm all availability is still right"
          variant="ghost"
        >
          <p className={ui.hint}>
            Availability entered by hand counts as confirmed for {hours.manual} hours; after that it shows as “to be confirmed”
            and can’t be reserved.
          </p>
        </ActionForm>

        <h3 className={ui.label}>
          Departures from {start} to {end}
        </h3>
        <p className={ui.pager}>
          <Link href={`?from=${dateWindow(-63, start).until}#rates`}>Earlier</Link>
          <Link href={`?from=${end}#rates`}>Later</Link>
        </p>
        {grid.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Departures with cabins available and international double prices</caption>
              <thead>
                <tr>
                  <th scope="col">Departs</th>
                  {active.map((c) => (
                    <th key={c.id} scope="col">
                      {c.name} ({c.deck})
                    </th>
                  ))}
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {grid.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Departs">
                      <Link href={p.departure(scheduleId, d.id)}>{d.departs_on}</Link>
                    </td>
                    {active.map((c) => {
                      const inv = d.inventory.find((i) => i.cabin_type_id === c.id);
                      const rate = d.rates.find(
                        (r) => r.cabin_type_id === c.id && r.occupancy === 2 && r.rate_plan === "international",
                      );
                      const stale = inv && !isFresh(inv.confirmed_at, inv.source, now, hours);
                      return (
                        <td key={c.id} data-label={c.name}>
                          {inv ? `${inv.available} left` : "—"}
                          {stale ? (
                            <>
                              {" "}
                              <Badge tone="danger">To confirm</Badge>
                            </>
                          ) : null}
                          <br />
                          {rate ? (
                            formatMoney({ amount: Number(rate.amount_minor), currency: rate.currency }, "en")
                          ) : (
                            <span className={ui.muted}>no price</span>
                          )}
                        </td>
                      );
                    })}
                    <td data-label="Status">
                      <ActionForm
                        action={setDepartureStatus.bind(null, orgId, vesselId, scheduleId, d.id)}
                        submit={d.status === "cancelled" ? "Restore" : "Cancel sailing"}
                        variant="ghost"
                      >
                        <input type="hidden" name="status" value={d.status === "cancelled" ? "scheduled" : "cancelled"} />
                        {d.status === "cancelled" ? <Badge tone="danger">Cancelled</Badge> : null}
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No departures in this window.</p>
        )}
      </Section>
    </>
  );
}

/** One departure: every rate (occupancy × plan × currency) per cabin type. */
export async function DeparturePage({
  orgId,
  vesselId,
  scheduleId,
  departureId,
}: {
  orgId: string | null;
  vesselId: string;
  scheduleId: string;
  departureId: string;
}) {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.departure(scheduleId, departureId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { data: d } = await db
    .from("departures")
    .select(
      "id, departs_on, returns_on, status, inventory(cabin_type_id, available, confirmed_at, source), rates(id, cabin_type_id, occupancy, rate_plan, currency, amount_minor, child_bands), partner_rates(id, partner_org_id, cabin_type_id, occupancy, currency, amount_minor)",
    )
    .eq("id", departureId)
    .eq("schedule_id", scheduleId)
    .maybeSingle();
  if (!d) notFound();
  const [cabins, partners] = await Promise.all([cabinTypes(vesselId), approvedPartners()]);
  const partnerName = (id: string) => partners.find((x) => x.id === id)?.display_name ?? "A travel partner";
  return (
    <>
      <p>
        <Link href={`${p.schedule(scheduleId)}#rates`}>← Schedule</Link>
      </p>
      <h1 className={ui.pageTitle}>
        Departure {d.departs_on} → {d.returns_on}
      </h1>
      {cabins.map((c) => {
        const inv = d.inventory.find((i) => i.cabin_type_id === c.id);
        const rates = d.rates.filter((r) => r.cabin_type_id === c.id);
        return (
          <Section key={c.id} title={`${c.name} (${c.deck})`} id={`c-${c.id}`}>
            <p>
              {inv ? (
                <>
                  {inv.available} cabins available · confirmed <CairoTime value={inv.confirmed_at} /> ({inv.source})
                </>
              ) : (
                <span className={ui.muted}>No availability entered.</span>
              )}
            </p>
            {rates.length ? (
              <ul className={ui.list}>
                {rates.map((r) => (
                  <li key={r.id} className={ui.actions}>
                    <span>
                      {RATE_PLANS.find((x) => x.value === r.rate_plan)?.label} · {["", "single", "double", "triple"][r.occupancy]}{" "}
                      · {formatMoney({ amount: Number(r.amount_minor), currency: r.currency }, "en")} per person
                    </span>
                    <ActionForm
                      action={deleteRate.bind(null, orgId, vesselId, scheduleId, departureId, r.id)}
                      submit="Remove"
                      variant="ghost"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={ui.muted}>No prices.</p>
            )}
            {d.partner_rates.filter((r) => r.cabin_type_id === c.id).length ? (
              <ul className={ui.list} aria-label="Company rates">
                {d.partner_rates
                  .filter((r) => r.cabin_type_id === c.id)
                  .map((r) => (
                    <li key={r.id} className={ui.actions}>
                      <span>
                        Company rate for {partnerName(r.partner_org_id)} · {["", "single", "double", "triple"][r.occupancy]} ·{" "}
                        {formatMoney({ amount: Number(r.amount_minor), currency: r.currency }, "en")} per person
                      </span>
                      <ActionForm
                        action={deletePartnerRate.bind(null, orgId, vesselId, scheduleId, departureId, r.id)}
                        submit="Remove"
                        variant="ghost"
                      />
                    </li>
                  ))}
              </ul>
            ) : null}
          </Section>
        );
      })}
      <p className={ui.muted}>
        To add or change prices for this date, use the form on the schedule page with this date as both From and To.
      </p>
    </>
  );
}

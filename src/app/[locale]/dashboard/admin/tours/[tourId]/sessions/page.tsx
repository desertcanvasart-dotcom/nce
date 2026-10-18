import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { dateWindow, WEEKDAYS } from "@/lib/product/departures";
import { requireAdmin } from "@/server/auth";
import { sessionsOf, tourForEditor } from "@/server/tours/queries";
import { isUuid } from "../../../../sections";
import { createSessions, setSessionStatus } from "../../actions";
import { SOLD_AS } from "../../labels";

const SOLD = Object.fromEntries(SOLD_AS.map((o) => [o.value, o.label])) as Record<string, string>;

/** DASH-ADM-067–069: bookable sessions with times, capacity, currency and price; shared or private. */
export default async function TourSessions({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = await params;
  if (!isUuid(tourId)) notFound();
  const session = await requireAdmin(["catalogue", "content"], `/dashboard/admin/tours/${tourId}/sessions/`);
  const canManage = session.adminRole === "super" || session.adminRole === "catalogue";
  const t = await tourForEditor(tourId);
  if (!t) notFound();
  const { today, until } = dateWindow(180);
  const sessions = await sessionsOf(tourId, `${today}T00:00:00Z`, `${until}T23:59:59Z`);

  return (
    <>
      <p>
        <Link href={`/dashboard/admin/tours/${t.id}/`}>← {t.name}</Link>
      </p>
      <h1 className={ui.pageTitle}>Sessions and prices</h1>
      <p className={ui.muted}>
        Times are in Cairo time. Shared sessions are sold per guest; private sessions take one party, priced per guest or per
        group. Guests aged 3 and over pay a per-guest price; under-3s are free{t.adults_only ? " (this tour is adults only)" : ""}
        . Tour prices are public.
      </p>

      {canManage ? (
        <Section title="Add sessions" id="add">
          <ActionForm action={createSessions.bind(null, t.id)} submit="Create sessions">
            <div className={ui.grid}>
              <Input label="From" name="from" type="date" required defaultValue={today} />
              <Input label="To" name="to" type="date" required />
              <Input label="Start times (Cairo)" name="times" required hint="One or more, for example “06:00, 15:30”." />
            </div>
            <Checkboxes
              legend="Weekdays"
              name="weekdays"
              options={WEEKDAYS.map((w) => ({ value: String(w.value), label: w.label }))}
              checked={[]}
            />
            <div className={ui.grid}>
              <Select label="Sold as" name="option" required placeholder="Choose" options={SOLD_AS} />
              <Input
                label="Capacity"
                name="capacity"
                inputMode="numeric"
                required
                hint="Shared: seats. Private: the largest party."
              />
              <Select
                label="Currency"
                name="currency"
                required
                defaultValue="USD"
                options={[
                  { value: "USD", label: "US$" },
                  { value: "EUR", label: "€" },
                ]}
              />
              <Input
                label="Price"
                name="price"
                inputMode="decimal"
                required
                hint="Per guest, or per group for a private group price."
              />
            </div>
          </ActionForm>
          <p className={ui.muted}>Each session lasts the tour’s duration. Running the same form again adds only what is new.</p>
        </Section>
      ) : null}

      <Section title="Next 180 days" id="sessions">
        {sessions.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Sessions of {t.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Starts</th>
                  <th scope="col">Sold as</th>
                  <th scope="col" className={ui.num}>
                    Capacity
                  </th>
                  <th scope="col" className={ui.num}>
                    Price
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Starts">
                      <CairoTime value={s.starts_at} />
                    </td>
                    <td data-label="Sold as">{SOLD[`${s.kind}:${s.pricing}`]}</td>
                    <td data-label="Capacity" className={ui.num}>
                      {s.capacity}
                    </td>
                    <td data-label="Price" className={ui.num}>
                      {formatMoney({ amount: Number(s.price_minor), currency: s.currency }, "en")}
                    </td>
                    <td data-label="Status">
                      {s.status === "cancelled" ? <Badge tone="danger">Cancelled</Badge> : <Badge tone="success">On sale</Badge>}
                    </td>
                    <td data-label="Action">
                      {canManage ? (
                        <ActionForm
                          action={setSessionStatus.bind(null, t.id, s.id)}
                          submit={s.status === "cancelled" ? "Restore" : "Cancel session"}
                          variant="ghost"
                        >
                          <input type="hidden" name="status" value={s.status === "cancelled" ? "scheduled" : "cancelled"} />
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>
            No sessions in the next 180 days. Until there is one, the tour can only be published as information.
          </p>
        )}
      </Section>
    </>
  );
}

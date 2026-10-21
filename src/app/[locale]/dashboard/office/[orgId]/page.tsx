import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, ui } from "@/components/dashboard/ui";
import { formatCairo } from "@/lib/time/cairo";
import { requireOrgRole } from "@/server/auth";
import { cairoDay, officeBookings } from "@/server/tours/office";
import { isUuid } from "../../sections";
import { cancelStart } from "./actions";

const MODE = {
  shared: "Shared",
  private: "Private",
  transfer: "Transfer",
  assist: "Meet and assist",
  program: "Sightseeing programme",
} as Record<string, string>;
const DAYS = 14;
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const ages = (a: number[]) => {
  const adults = a.filter((x) => x >= 12).length;
  const kids = a.filter((x) => x < 12);
  return (
    `${a.length} ${a.length === 1 ? "guest" : "guests"}` +
    (kids.length ? ` (${adults} adults; children aged ${kids.join(", ")})` : "")
  );
};

/** ADR-097: the office's bookings for two weeks, by day and start, with guests and pickup details. */
export default async function OfficeBookings({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", { kind: "office", returnTo: `/dashboard/office/${orgId}/` });
  const today = cairoDay(new Date().toISOString());
  const asked = (await searchParams).from;
  const from = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const days = await officeBookings(from, DAYS);
  const canCancel = company.teamRole === "owner" || company.teamRole === "reservations";
  const base = `/dashboard/office/${orgId}/`;

  return (
    <>
      <h1 className={ui.pageTitle}>Bookings by day</h1>
      <p className={ui.muted}>
        Paid bookings for {formatCairo(`${from}T12:00:00Z`, { time: false })} and the {DAYS - 1} days after, in Cairo time. Shared
        groups take at most 8 guests.
      </p>
      <p>
        <Link href={`${base}?from=${shift(from, -DAYS)}`}>Earlier</Link> · <Link href={base}>Today</Link> ·{" "}
        <Link href={`${base}?from=${shift(from, DAYS)}`}>Later</Link>
      </p>
      {days.length ? (
        days.map(({ day, starts }) => (
          <Section key={day} id={`day-${day}`} title={formatCairo(`${day}T12:00:00Z`, { time: false })}>
            {starts.map((s) => {
              const live = s.orders.filter((o) => o.status === "confirmed");
              return (
                <article key={s.key} className={ui.card} aria-label={`${s.tour} at ${formatCairo(s.startsAt, { date: false })}`}>
                  <h3>
                    {formatCairo(s.startsAt, { date: false })} · {s.tour}
                    {s.label ? ` · ${s.label}` : ""} <Badge tone="neutral">{MODE[s.mode] ?? s.mode}</Badge>
                  </h3>
                  <p className={ui.muted}>
                    {s.guests} {s.guests === 1 ? "guest" : "guests"} booked
                    {s.mode === "shared" ? ` · ${Math.max(8 - s.guests, 0)} places left` : ""}
                  </p>
                  <ul>
                    {s.orders.map((o) => (
                      <li key={o.id}>
                        {o.status === "cancelled" ? (
                          <del>
                            {o.reference} · {o.lead_name}
                          </del>
                        ) : (
                          <strong>
                            {o.reference} · {o.lead_name}
                          </strong>
                        )}{" "}
                        · {ages(o.ages)}
                        {o.vehicle ? ` · ${o.vehicle}` : ""}
                        {o.notes ? <span className={ui.muted}> · Pickup and notes: {o.notes}</span> : null}
                        {o.status === "cancelled" ? <span className={ui.muted}> · {o.cancelled_reason}</span> : null}
                      </li>
                    ))}
                  </ul>
                  {canCancel && s.rateId && live.length && Date.parse(s.startsAt) > Date.now() ? (
                    <details>
                      <summary>Can&apos;t run this start?</summary>
                      <ActionForm
                        action={cancelStart.bind(null, orgId, s.rateId, s.startsAt)}
                        submit="Cancel this start"
                        variant="outline"
                      >
                        <p className={ui.muted}>
                          Every booking on it is cancelled and paid ones are refunded in full. The customers are told, with your
                          reason.
                        </p>
                        <Input label="Reason" name="reason" required maxLength={500} />
                      </ActionForm>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </Section>
        ))
      ) : (
        <p className={ui.muted}>No bookings in these two weeks.</p>
      )}
    </>
  );
}

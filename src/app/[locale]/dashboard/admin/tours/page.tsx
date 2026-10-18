import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { TOUR_KINDS } from "@/lib/tours/tours";
import { requireAdmin } from "@/server/auth";
import { toursList } from "@/server/tours/queries";
import { createProgram, createTour } from "./actions";
import { KIND, READINESS_BADGE } from "./labels";

/** DASH-ADM-058, 070, 073, DATA-042: Nilecruz's own tours and programs. Operators have no access. */
export default async function ToursPage() {
  const session = await requireAdmin(["catalogue", "content"], "/dashboard/admin/tours/");
  const canManage = session.adminRole === "super" || session.adminRole === "catalogue";
  const { tours, programs } = await toursList();

  return (
    <>
      <h1 className={ui.pageTitle}>Tours and sightseeing</h1>
      <p>
        Tours and extras (museum visits, excursions, evening tours, transfers) are Nilecruz’s own products, sold separately from
        cruises. A published tour is information only until it has a supplier, cancellation bands and a future session with a
        price. <Link href="/dashboard/admin/tours/suppliers/">Suppliers</Link>
      </p>

      <Section title="Tours" id="tours">
        {tours.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Tours</caption>
              <thead>
                <tr>
                  <th scope="col">Tour</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={ui.num}>
                    Upcoming sessions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tours.map((t) => (
                  <tr key={t.id}>
                    <th scope="row" data-label="Tour">
                      <Link href={`/dashboard/admin/tours/${t.id}/`}>{t.name}</Link>{" "}
                      {t.is_sample ? <Badge tone="accent">Sample data</Badge> : null}
                    </th>
                    <td data-label="Kind">{KIND[t.kind]}</td>
                    <td data-label="Location">{t.location}</td>
                    <td data-label="Status">
                      <Badge tone={READINESS_BADGE[t.readiness.state].tone}>{READINESS_BADGE[t.readiness.state].text}</Badge>
                    </td>
                    <td data-label="Upcoming sessions" className={ui.num}>
                      {t.futureSessions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No tours yet.</p>
        )}
        {canManage ? (
          <ActionForm action={createTour} submit="Create tour" variant="outline">
            <div className={ui.grid}>
              <Input label="Name" name="name" required maxLength={160} />
              <Select label="Kind" name="kind" required placeholder="Choose" options={TOUR_KINDS} />
              <Input label="Location" name="location" required maxLength={120} hint="Where it happens, for example “Aswan”." />
              <Input label="Duration: hours" name="hours" inputMode="numeric" required defaultValue={3} />
              <Input label="and minutes" name="minutes" inputMode="numeric" required defaultValue={0} />
            </div>
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Sightseeing programs" id="programs">
        <p className={ui.muted}>Several days of tours that go with a cruise schedule. Day 1 is the departure day.</p>
        {programs.length ? (
          <ul className={ui.list}>
            {programs.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/admin/tours/programs/${p.id}/`}>{p.name}</Link> · {p.days} days · {p.items} tour
                {p.items === 1 ? "" : "s"} · {p.schedules} schedule{p.schedules === 1 ? "" : "s"} ·{" "}
                {p.visibility === "published" ? "published" : "private"}{" "}
                {p.is_sample ? <Badge tone="accent">Sample data</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No programs yet.</p>
        )}
        {canManage ? (
          <ActionForm action={createProgram} submit="Create program" variant="outline">
            <div className={ui.grid}>
              <Input label="Program name" name="name" required maxLength={160} />
              <Input
                label="Days"
                name="days"
                inputMode="numeric"
                required
                defaultValue={4}
                hint="Usually the cruise’s nights + 1."
              />
            </div>
          </ActionForm>
        ) : null}
      </Section>
    </>
  );
}

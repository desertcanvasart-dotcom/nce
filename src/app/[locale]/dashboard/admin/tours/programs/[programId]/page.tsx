import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { dateWindow } from "@/lib/product/departures";
import { programAvailability } from "@/lib/tours/tours";
import { requireAdmin } from "@/server/auth";
import { allSchedules, programAvailabilityData, programForEditor, toursList } from "@/server/tours/queries";
import { isUuid } from "../../../../sections";
import { addProgramItem, removeProgramItem, saveProgram, saveProgramSchedules, saveProgramTexts } from "../../actions";

type Props = { params: Promise<{ programId: string }>; searchParams: Promise<{ guests?: string }> };

/** DASH-ADM-070, 071: a multi-day sightseeing program linked to cruise schedules, with its availability check. */
export default async function ProgramEditor({ params, searchParams }: Props) {
  const { programId } = await params;
  if (!isUuid(programId)) notFound();
  const session = await requireAdmin(["catalogue", "content"], `/dashboard/admin/tours/programs/${programId}/`);
  const canManage = session.adminRole === "super" || session.adminRole === "catalogue";
  const guestsParam = Number((await searchParams).guests ?? 1);
  const guests = Number.isInteger(guestsParam) && guestsParam >= 1 && guestsParam <= 50 ? guestsParam : 1;
  const [p, { tours }, schedules] = await Promise.all([programForEditor(programId), toursList(), allSchedules()]);
  if (!p) notFound();

  const items = p.program_items
    .map((i) => ({ day_number: i.day_number, tour_id: i.tour_id, tour_name: i.tour?.name ?? "Tour" }))
    .sort((a, b) => a.day_number - b.day_number || a.tour_name.localeCompare(b.tour_name));
  const linked = p.program_schedules.map((s) => s.schedule_id);
  const { today, until } = dateWindow(90);
  const data = await programAvailabilityData(linked, [...new Set(items.map((i) => i.tour_id))], today, until, p.days);
  const checks = programAvailability(data.departures, items, data.sessions, guests);
  const dayNumbers = [...new Set(items.map((i) => i.day_number))];
  const desc = (l: string) => p.program_translations.find((x) => x.locale === l)?.description ?? "";
  const complete = checks.filter((c) => !c.missing.length).length;

  return (
    <>
      <p>
        <Link href="/dashboard/admin/tours/#programs">← Tours and sightseeing</Link>
      </p>
      <h1 className={ui.pageTitle}>{p.name}</h1>
      <p className={ui.actions}>
        <Badge tone={p.visibility === "published" ? "success" : "neutral"}>
          {p.visibility === "published" ? "Published" : "Private draft"}
        </Badge>
        {p.is_sample ? <Badge tone="accent">Sample data</Badge> : null}
        <span className={ui.muted}>{p.days} days · day 1 is the departure day</span>
      </p>

      {canManage ? (
        <Section title="Details" id="details">
          <ActionForm action={saveProgram.bind(null, p.id)} submit="Save details" variant="outline">
            <div className={ui.grid}>
              <Input label="Name" name="name" required maxLength={160} defaultValue={p.name} />
              <Input label="Days" name="days" inputMode="numeric" required defaultValue={p.days} />
              <Select
                label="Visibility"
                name="visibility"
                required
                defaultValue={p.visibility}
                options={[
                  { value: "private", label: "Private draft" },
                  { value: "published", label: "Published" },
                ]}
              />
            </div>
          </ActionForm>
        </Section>
      ) : null}

      <Section title="Descriptions" id="texts">
        <ActionForm action={saveProgramTexts.bind(null, p.id)} submit="Save descriptions" variant="outline">
          <TextArea label="English" name="description_en" rows={4} maxLength={6000} defaultValue={desc("en")} lang="en" />
          <TextArea label="Spanish" name="description_es" rows={4} maxLength={6000} defaultValue={desc("es")} lang="es" />
          <TextArea label="Japanese" name="description_ja" rows={4} maxLength={6000} defaultValue={desc("ja")} lang="ja" />
        </ActionForm>
      </Section>

      <Section title="Day by day" id="days">
        {items.length ? (
          <ul className={ui.list}>
            {items.map((i) => (
              <li key={`${i.day_number}/${i.tour_id}`}>
                Day {i.day_number}: <Link href={`/dashboard/admin/tours/${i.tour_id}/`}>{i.tour_name}</Link>
                {canManage ? (
                  <ActionForm
                    action={removeProgramItem.bind(null, p.id, i.day_number, i.tour_id)}
                    submit={`Remove ${i.tour_name} from day ${i.day_number}`}
                    variant="ghost"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No tours yet.</p>
        )}
        {canManage ? (
          <ActionForm action={addProgramItem.bind(null, p.id)} submit="Add to the program" variant="outline" resetOnSuccess>
            <div className={ui.grid}>
              <Select
                label="Day"
                name="day_number"
                required
                placeholder="Choose"
                options={Array.from({ length: p.days }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))}
              />
              <Select
                label="Tour"
                name="tour_id"
                required
                placeholder="Choose"
                options={tours.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Cruise schedules" id="schedules">
        {canManage ? (
          schedules.length ? (
            <ActionForm action={saveProgramSchedules.bind(null, p.id)} submit="Save schedules" variant="outline">
              <Checkboxes
                legend="Linked schedules"
                name="schedule_id"
                options={schedules.map((s) => ({ value: s.id, label: s.label }))}
                checked={linked}
              />
            </ActionForm>
          ) : (
            <p className={ui.muted}>No cruise schedules exist yet.</p>
          )
        ) : (
          <ul className={ui.list}>
            {schedules
              .filter((s) => linked.includes(s.id))
              .map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
          </ul>
        )}
      </Section>

      <Section title="Availability, next 90 days" id="availability">
        <form method="get" className={ui.grid} aria-label="Party size for the check">
          <Input label="Guests in the party" name="guests" inputMode="numeric" defaultValue={guests} />
          <div className={ui.filterSubmit}>
            <Button type="submit" variant="outline">
              Check
            </Button>
          </div>
        </form>
        {!linked.length || !items.length ? (
          <p className={ui.muted}>Link a cruise schedule and add tours to check availability.</p>
        ) : checks.length ? (
          <>
            <p>
              {complete} of {checks.length} departures have every tour available for {guests} guest{guests === 1 ? "" : "s"}. The
              program is offered only on those.
            </p>
            <div className={ui.tableWrap}>
              <table className={`${ui.table} ${ui.stack}`}>
                <caption className="visually-hidden">Program availability by departure</caption>
                <thead>
                  <tr>
                    <th scope="col">Departure</th>
                    {dayNumbers.map((n) => (
                      <th key={n} scope="col">
                        Day {n}
                      </th>
                    ))}
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.departure.id}>
                      <th scope="row" data-label="Departure">
                        {c.departure.departs_on} · {c.departure.label}
                      </th>
                      {c.days.map((d) => (
                        <td key={d.day_number} data-label={`Day ${d.day_number}`}>
                          {d.date}: {d.tours.map((x) => `${x.tour_name} ${x.sessions ? "✓" : "✗"}`).join(", ")}
                        </td>
                      ))}
                      <td data-label="Result">
                        {c.missing.length ? (
                          <>
                            <Badge tone="danger">Missing</Badge> {c.missing.join("; ")}
                          </>
                        ) : (
                          <Badge tone="success">Available</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={ui.muted}>The linked schedules have no departures in the next 90 days.</p>
        )}
      </Section>
    </>
  );
}

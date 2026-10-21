import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { bandLines, TOUR_KINDS, type CancellationBand } from "@/lib/tours/tours";
import { requireAdmin } from "@/server/auth";
import { allSchedules, destinationsList, suppliers, tourForEditor, tourOffices } from "@/server/tours/queries";
import { priceLine, rateFromRow } from "@/lib/tours/calendar";
import { isUuid } from "../../../sections";
import {
  deleteTourPhoto,
  saveBands,
  saveTourBasics,
  saveTourPhoto,
  saveTourSchedules,
  saveTourTexts,
  setTourVisibility,
  uploadTourPhoto,
} from "../actions";
import { KIND, READINESS_BADGE } from "../labels";

const LANG = { en: "English", es: "Spanish", ja: "Japanese" } as const;

/** DASH-ADM-058–066, 073: one tour. Catalogue admins edit everything; content admins edit texts and photos. */
export default async function TourEditor({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = await params;
  if (!isUuid(tourId)) notFound();
  const session = await requireAdmin(["catalogue", "content"], `/dashboard/admin/tours/${tourId}/`);
  const canManage = session.adminRole === "super" || session.adminRole === "catalogue";
  const [t, supplierList, destinations, schedules, offices] = await Promise.all([
    tourForEditor(tourId),
    suppliers(),
    destinationsList(),
    allSchedules(),
    tourOffices(),
  ]);
  if (!t) notFound();
  const bands = t.cancellation_bands as CancellationBand[];
  const assigned = t.tour_schedules.map((s) => s.schedule_id);
  const alt = (m: (typeof t.media)[number], l: string) => m.media_translations.find((x) => x.locale === l)?.alt ?? "";

  return (
    <>
      <p>
        <Link href="/dashboard/admin/tours/">← Tours and sightseeing</Link>
      </p>
      <h1 className={ui.pageTitle}>{t.name}</h1>
      <p className={ui.actions}>
        <Badge tone={READINESS_BADGE[t.readiness.state].tone}>{READINESS_BADGE[t.readiness.state].text}</Badge>
        {t.is_sample ? <Badge tone="accent">Sample data</Badge> : null}
        <span className={ui.muted}>
          {KIND[t.kind]} · {t.location} · /tours-extras/{t.slug}/
        </span>
      </p>
      {t.readiness.missing.length ? (
        <p>
          {t.readiness.state === "draft" ? "Before it can be booked it needs: " : "To become bookable it needs: "}
          {t.readiness.missing.join(", ")}.
        </p>
      ) : null}
      <p>
        <Link href={`/dashboard/admin/tours/${t.id}/sessions/`}>Sessions and prices ({t.futureSessions} upcoming)</Link>
      </p>

      {canManage ? (
        <Section title="Visibility" id="visibility">
          <ActionForm action={setTourVisibility.bind(null, t.id)} submit="Save visibility" variant="outline">
            <Select
              label="Visibility"
              name="visibility"
              required
              defaultValue={t.visibility}
              options={[
                { value: "private", label: "Private draft (admins only)" },
                { value: "published", label: "Published (information only until bookable)" },
              ]}
            />
          </ActionForm>
        </Section>
      ) : null}

      <Section title="Details" id="details">
        {canManage ? (
          <ActionForm action={saveTourBasics.bind(null, t.id)} submit="Save details" variant="outline">
            <div className={ui.grid}>
              <Input label="Name" name="name" required maxLength={160} defaultValue={t.name} />
              <Select label="Kind" name="kind" required options={TOUR_KINDS} defaultValue={t.kind} />
              <Input label="Location" name="location" required maxLength={120} defaultValue={t.location} />
              <Select
                label="Destination"
                name="destination_id"
                placeholder="None"
                defaultValue={t.destination_id}
                options={destinations.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Input
                label="Duration: hours"
                name="hours"
                inputMode="numeric"
                required
                defaultValue={Math.floor(t.duration_minutes / 60)}
              />
              <Input label="and minutes" name="minutes" inputMode="numeric" required defaultValue={t.duration_minutes % 60} />
              <Select
                label="Supplier"
                name="supplier_id"
                placeholder="Not chosen yet"
                defaultValue={t.supplier_id}
                options={supplierList.map((s) => ({ value: s.id, label: s.name }))}
                hint="Private to admins. Add suppliers on the Suppliers page."
              />
              <Select
                label="Office"
                name="office_id"
                placeholder="Not chosen yet"
                defaultValue={t.office_id}
                options={offices.map((o) => ({ value: o.id, label: o.display_name }))}
                hint="The Nilecruz office that runs it. It sees this tour's bookings in its own dashboard."
              />
            </div>
            <Checkboxes
              legend="Selling"
              name="standalone"
              options={[{ value: "yes", label: "Sold on its own, not only with a cruise" }]}
              checked={t.standalone ? ["yes"] : []}
            />
            <Checkboxes
              legend="Guests"
              name="adults_only"
              options={[{ value: "yes", label: "Adults only (every guest 18 or over)" }]}
              checked={t.adults_only ? ["yes"] : []}
            />
          </ActionForm>
        ) : (
          <p>
            {t.duration_minutes} minutes · supplier {t.supplier?.name ?? "not chosen"} · office{" "}
            {t.office?.display_name ?? "not chosen"} · {t.standalone ? "sold on its own" : "with cruises only"}
            {t.adults_only ? " · adults only" : ""}
          </p>
        )}
      </Section>

      {(["en", "es", "ja"] as const).map((l) => {
        const tr = t.tr(l);
        return (
          <Section key={l} title={`Texts in ${LANG[l]}`} id={`texts-${l}`}>
            <ActionForm action={saveTourTexts.bind(null, t.id, l)} submit={`Save ${LANG[l]} texts`} variant="outline">
              <TextArea
                label="Description"
                name="description"
                rows={5}
                maxLength={6000}
                defaultValue={tr?.description}
                lang={l}
              />
              <TextArea
                label="Itinerary"
                name="itinerary"
                rows={5}
                defaultValue={tr?.itinerary.join("\n")}
                lang={l}
                hint="One step per line, in order."
              />
              <div className={ui.grid}>
                <TextArea
                  label="Included"
                  name="inclusions"
                  rows={4}
                  defaultValue={tr?.inclusions.join("\n")}
                  lang={l}
                  hint="One per line."
                />
                <TextArea
                  label="Not included"
                  name="exclusions"
                  rows={4}
                  defaultValue={tr?.exclusions.join("\n")}
                  lang={l}
                  hint="One per line."
                />
              </div>
              <TextArea
                label="Meeting point or pickup"
                name="meeting_point"
                rows={3}
                maxLength={1500}
                defaultValue={tr?.meeting_point}
                lang={l}
              />
              <TextArea
                label="Cancellation wording"
                name="cancellation_terms"
                rows={3}
                maxLength={3000}
                defaultValue={tr?.cancellation_terms}
                lang={l}
                hint="What travellers read; the bands below do the calculation."
              />
            </ActionForm>
          </Section>
        );
      })}

      <Section title="Rates" id="rates">
        <p className={ui.muted}>
          Booked on the calendar (ADR-097). Rates come from the rate sheet: <code>pnpm import:tour-rates</code>. With no bands
          below, the standard rule applies: free until 48 hours before, then 100 %.
        </p>
        {t.tour_rates.length ? (
          <ul className={ui.list}>
            {t.tour_rates.map((r) => (
              <li key={r.id}>
                {priceLine(rateFromRow(r)).text}
                {r.label ? ` · ${r.label}` : ""} ·{" "}
                {r.start_times.length ? r.start_times.map((x) => x.slice(0, 5)).join(", ") : "flexible start"}
                {r.days.length < 7
                  ? ` · ${r.days.map((d) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]).join(", ")}`
                  : " · every day"}
                {` · book ${r.lead_hours} h ahead`}
                {r.active ? "" : " · off"}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No rates yet: the tour shows “Prices coming soon”.</p>
        )}
      </Section>

      <Section title="Cancellation bands" id="bands">
        <p className={ui.muted}>
          For each band: cancelled this many days or more before the start, this share of the price is charged. Include a band
          from 0 days. The charge can’t go down as the start gets closer.
        </p>
        {canManage ? (
          <ActionForm action={saveBands.bind(null, t.id)} submit="Save bands" variant="outline">
            {[...bands, ...Array(Math.max(0, 6 - bands.length)).fill(null)]
              .slice(0, 6)
              .map((b: CancellationBand | null, i: number) => (
                <div key={i} className={ui.grid}>
                  <Input
                    label={`Band ${i + 1}: days before`}
                    name={`from_days_${i}`}
                    inputMode="numeric"
                    defaultValue={b?.from_days}
                  />
                  <Input label="% charged" name={`percent_${i}`} inputMode="numeric" defaultValue={b?.percent} />
                </div>
              ))}
          </ActionForm>
        ) : bands.length ? (
          <ul className={ui.list}>
            {bandLines(bands).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No bands yet.</p>
        )}
      </Section>

      <Section title="Cruise schedules" id="schedules">
        <p className={ui.muted}>Offered to travellers on these cruises (DASH-ADM-066).</p>
        {canManage ? (
          schedules.length ? (
            <ActionForm action={saveTourSchedules.bind(null, t.id)} submit="Save schedules" variant="outline">
              <Checkboxes
                legend="Schedules"
                name="schedule_id"
                options={schedules.map((s) => ({ value: s.id, label: s.label }))}
                checked={assigned}
              />
            </ActionForm>
          ) : (
            <p className={ui.muted}>No cruise schedules exist yet.</p>
          )
        ) : (
          <ul className={ui.list}>
            {schedules
              .filter((s) => assigned.includes(s.id))
              .map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
          </ul>
        )}
      </Section>

      <Section title="Photos" id="photos">
        {t.media.length ? (
          <ul className={ui.thumbs}>
            {t.media.map((m) => (
              <li key={m.id} className={ui.thumb}>
                {m.url ? (
                  <Image src={m.url} alt={alt(m, "en")} width={m.width} height={m.height} sizes="12rem" unoptimized />
                ) : (
                  <span className={ui.muted}>Preview unavailable</span>
                )}
                <ActionForm action={saveTourPhoto.bind(null, t.id, m.id)} submit="Save photo details" variant="outline">
                  <Input label="Description (English)" name="alt_en" required maxLength={300} defaultValue={alt(m, "en")} />
                  <Input label="Spanish" name="alt_es" maxLength={300} defaultValue={alt(m, "es")} />
                  <Input label="Japanese" name="alt_ja" maxLength={300} defaultValue={alt(m, "ja")} />
                  <Input label="Credit" name="credit" required maxLength={200} defaultValue={m.credit} />
                  <Input label="Order" name="sort_order" inputMode="numeric" defaultValue={m.sort_order} />
                </ActionForm>
                <ActionForm action={deleteTourPhoto.bind(null, t.id, m.id)} submit="Remove photo" variant="ghost" />
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No photos yet.</p>
        )}
        <ActionForm
          action={uploadTourPhoto.bind(null, t.id)}
          submit="Upload photo"
          resetOnSuccess
          variant="outline"
          encType="multipart/form-data"
        >
          <div className={ui.field}>
            <label className={ui.label} htmlFor="tour-photo">
              Photo (JPEG, PNG, WebP or AVIF, up to 15 MB)
            </label>
            <input id="tour-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          </div>
          <Input
            label="Description for screen readers (English)"
            name="alt_en"
            required
            maxLength={300}
            hint="What the photo shows, in one sentence."
          />
          <Input label="Spanish" name="alt_es" maxLength={300} />
          <Input label="Japanese" name="alt_ja" maxLength={300} />
          <Input label="Credit" name="credit" required maxLength={200} hint="Photographer or source, as the licence asks." />
          <Checkboxes
            legend="Rights"
            name="rights"
            options={[{ value: "yes", label: "Nilecruz has the right to publish this photo" }]}
            checked={[]}
          />
        </ActionForm>
      </Section>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { formatCairo } from "@/lib/time/cairo";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { requireUser } from "@/server/auth";
import { tourForOrdering } from "@/server/tours/orders";
import { isUuid } from "../../../../sections";
import { orderTour } from "../../../actions";
import { money, PRICING, SESSION_KIND } from "../../../../_bookings/TourOrderBits";

/** DASH-PAY-014: order places on a session. The places are held for 60 minutes while the customer pays by card. */
export default async function BookTour({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = await params;
  if (!isUuid(tourId)) notFound();
  await requireUser(`/dashboard/journey/tours/book/${tourId}/`);
  const t = await tourForOrdering(tourId);
  if (!t) notFound();
  const open = t.sessions.filter((s) => s.placesLeft > 0);
  const bands = t.cancellation_bands as CancellationBand[];
  return (
    <>
      <p>
        <Link href="/dashboard/journey/tours/">← Tours and sightseeing</Link>
      </p>
      <h1 className={ui.pageTitle}>{t.name}</h1>
      {t.en?.description ? <p className={ui.prewrap}>{t.en.description}</p> : null}
      {t.en?.meeting_point ? <p className={ui.muted}>Meeting point: {t.en.meeting_point}</p> : null}
      <Section title="Book" id="book">
        {open.length ? (
          <ActionForm action={orderTour.bind(null, t.id)} submit="Book and pay by card">
            <Select
              label="Date and time (Cairo)"
              name="session"
              required
              placeholder="Choose"
              options={open.map((s) => ({
                value: s.id,
                label: `${formatCairo(s.starts_at)} · ${SESSION_KIND[s.kind]} · ${money(s.price_minor, s.currency)} ${PRICING[s.pricing]} · ${
                  s.kind === "private" ? `up to ${s.capacity} guests` : `${s.placesLeft} places left`
                }`,
              }))}
            />
            <div className={ui.grid}>
              <Input
                label="Ages of everyone coming"
                name="ages"
                required
                hint={t.adults_only ? "Adults only (18 and over). For example “42, 40”." : "For example “42, 40, 9”."}
              />
              <Input label="Lead guest's full name" name="lead" required maxLength={160} />
            </div>
            <TextArea
              label="Pickup place and anything the guide should know"
              name="notes"
              rows={3}
              maxLength={1000}
              hint={t.kind === "transfer" ? "For airport transfers, give your flight number and time." : undefined}
            />
            <h3 className={ui.subTitle}>Cancellation policy</h3>
            {t.en?.cancellation_terms ? <p>{t.en.cancellation_terms}</p> : null}
            <ul className={ui.list}>
              {bandLines(bands, "the start").map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <Checkboxes
              legend="Before booking"
              name="terms"
              options={[{ value: "yes", label: "I have read the tour details and the cancellation policy" }]}
              checked={[]}
            />
            <p className={ui.muted}>
              Your places are held for 60 minutes while you pay by card on Stripe’s secure page. Tours are paid separately from
              your cruise.
            </p>
          </ActionForm>
        ) : (
          <p className={ui.muted}>No dates with free places right now.</p>
        )}
      </Section>
    </>
  );
}

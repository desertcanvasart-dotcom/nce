import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ds/Icon/Icon";
import { Media } from "@/components/ds/Media/Media";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import {
  callsAt,
  itinerariesOf,
  riverNeighbours,
  RIVER_STOPS,
  type ItineraryPlaces,
  type RiverStop,
} from "@/content/river-stops";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { sortListing, toCard, type ListingVessel } from "@/lib/marketplace/listing";
import { isBuilt } from "@/lib/seo/links";
import styles from "./editorial.module.css";
import d from "./destinations.module.css";

/**
 * A destination page's own data (Islam's destinations brief, 4 Nov 2026), from the same stop records as the hub: its
 * photo once licensed (an illustration of a temple until then, never a boat), main sights, typical visit and our team's
 * note when they exist, and where it sits on the river, with the stops before and after it.
 */
export async function DestinationLead({ locale, stop }: { locale: Locale; stop: RiverStop }) {
  const t = await getTranslations({ locale, namespace: "destinationsPillar" });
  const { previous, next } = riverNeighbours(stop);
  return (
    <>
      <div className={styles.scene}>
        <Media
          image={stop.image ? { ...stop.image, alt: stop.image.alt[locale] } : undefined}
          time="dawn"
          vessel={null}
          temple
          priority
          sizes="(min-width: 1024px) 70vw, 100vw"
          className={d.stopArt}
        />
      </div>
      <div className={d.facts}>
        <h2 className={d.eyebrow}>{t("journey.sights")}</h2>
        <ul className={d.sights}>
          {stop.mainSights[locale].map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        {stop.visitLength ? (
          <p className={d.fact}>
            <Icon name="clock" />
            <span>
              <strong>{t("journey.visit")}</strong> {stop.visitLength[locale]}
            </span>
          </p>
        ) : null}
        {stop.insiderNote ? (
          <p className={d.note}>
            <strong>{t("journey.team")}</strong> {stop.insiderNote[locale]}
          </p>
        ) : null}
      </div>
      <nav className={d.position} aria-labelledby="river-position">
        <h2 id="river-position">{t("child.river")}</h2>
        <ol className={d.miniRiver}>
          {RIVER_STOPS.map((s) => (
            <li key={s.key} aria-current={s === stop ? "location" : undefined}>
              {s.name[locale]}
              {s === stop ? <span className="visually-hidden"> ({t("child.here")})</span> : null}
            </li>
          ))}
        </ol>
        <ul className={d.neighbours}>
          {previous?.path && isBuilt(previous.path) ? (
            <li>
              <Link href={previous.path}>← {t("child.previous", { name: previous.name[locale] })}</Link>
            </li>
          ) : null}
          {next?.path && isBuilt(next.path) ? (
            <li>
              <Link href={next.path}>{t("child.next", { name: next.name[locale] })} →</Link>
            </li>
          ) : null}
        </ul>
        <p>
          <Link href="/cruises/" className={styles.more}>
            {t("child.all")}
          </Link>
        </p>
      </nav>
    </>
  );
}

/** "Cruises that stop here": only vessels whose itineraries call at this stop; nothing at all when none do. */
export async function StopCruises({
  locale,
  stop,
  all,
  places,
}: {
  locale: Locale;
  stop: RiverStop;
  all: ListingVessel[];
  places: ItineraryPlaces;
}) {
  const fits = sortListing(all.filter((v) => itinerariesOf(v, places).some((it) => callsAt(it, stop))));
  if (!fits.length) return null;
  const t = await getTranslations({ locale, namespace: "destinationsPillar" });
  return (
    <section className={styles.closing} aria-labelledby="closing-cruises">
      <h2 id="closing-cruises">{t("cruises.heading")}</h2>
      <ListingGrid cards={fits.slice(0, 3).map(toCard)} />
    </section>
  );
}

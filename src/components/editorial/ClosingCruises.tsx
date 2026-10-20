import { Link } from "@/i18n/navigation";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import type { VesselType } from "@/components/ds/lib/types";
import { facetBySlug, sortListing, toCard, type ListingVessel } from "@/lib/marketplace/listing";
import type { Link as SiloLink } from "@/lib/seo/links";
import styles from "./editorial.module.css";

/**
 * SEO-012, 024: every informational page ends with a row of up to three real cruises from the matching listing, and a
 * link to that listing. `type` narrows the cards where the listing's own facet page doesn't exist yet.
 */
export function ClosingCruises({
  all,
  listing,
  type,
  title,
}: {
  /** Every public vessel (the page loads them: components don't read the server). */
  all: ListingVessel[];
  listing: SiloLink;
  type?: VesselType;
  title?: string;
}) {
  const facet = facetBySlug(listing.href.replace(/^\/cruises\/|\/$/g, ""));
  const fits = sortListing(all.filter((v) => (facet ? facet.match(v) : true) && (!type || v.type === type)));
  return (
    <section className={styles.closing} aria-labelledby="closing-cruises">
      <h2 id="closing-cruises">{title ?? "Cruises you can book"}</h2>
      {fits.length ? (
        <ListingGrid cards={fits.slice(0, 3).map(toCard)} />
      ) : (
        <p className={styles.muted}>No cruises of this kind are published yet.</p>
      )}
      <p>
        <Link href={listing.href} className={styles.more}>
          See all: {listing.anchor}
        </Link>
      </p>
    </section>
  );
}

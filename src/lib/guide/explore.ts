import type { VesselType } from "@/components/ds/lib/types";
import { sortListing, type ListingVessel } from "@/lib/marketplace/listing";

/** The stretch the guide's classic routes cover. A vessel with no itinerary here may sail elsewhere (Lake Nasser). */
const CLASSIC = new Set(["Luxor", "Esna", "Aswan"]);
const TYPES: VesselType[] = ["sail", "motor", "steam"];

/**
 * "Vessels to explore" on the guide's pages (Islam's guide brief, 4 Nov 2026): one vessel of each type that the
 * catalogue shows sailing the page's route, or the Luxor–Esna–Aswan stretch when the page has no route of its own.
 * Only vessels with such an itinerary qualify, so a Lake Nasser ship is never shown as a Luxor–Aswan example. Empty
 * when fewer than two types qualify (a single type isn't a choice), unless the page is about one type.
 */
export function exploreVessels(
  all: ListingVessel[],
  { route, type }: { route?: { origin: string; destination: string }; type?: VesselType } = {},
): ListingVessel[] {
  const sails = (v: ListingVessel) =>
    v.itineraries.some((i) =>
      route
        ? i.origin === route.origin && i.destination === route.destination
        : CLASSIC.has(i.origin) && CLASSIC.has(i.destination),
    );
  const picked = (type ? [type] : TYPES)
    .map((t) => sortListing(all.filter((v) => v.type === t && sails(v)))[0])
    .filter((v): v is ListingVessel => !!v);
  return type || picked.length >= 2 ? picked : [];
}

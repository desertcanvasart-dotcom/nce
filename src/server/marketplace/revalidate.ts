import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG } from "./queries";

/**
 * The public marketplace shows a change at once (PERF-010): vessels, cabins, schedules, departures, rates, inventory,
 * evaluations and operator approval all feed the listing and the "from" price. Expiring the tag (rather than serving
 * the old page once more) means the next visitor sees the change.
 */
export function revalidateCatalogue(): void {
  revalidateTag(CATALOGUE_TAG, { expire: 0 });
}

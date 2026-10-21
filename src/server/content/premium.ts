import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/server/db/admin";

/**
 * EXP-006: the premium periods (3-day payment deadlines) for public pages. They're stated in the payment rules anyway;
 * the table itself stays signed-in only, so this reads them on the server, cached for an hour.
 */
export const publicPremiumPeriods = unstable_cache(
  async () => {
    try {
      const { data } = await getAdminDb().from("premium_periods").select("name, starts_on, ends_on").order("starts_on");
      return data ?? [];
    } catch {
      return []; // a build without a database: the fixed rules still show
    }
  },
  ["public-premium-periods-v1"],
  { revalidate: 3600 },
);

import type { IconName } from "../Icon/icons";
import type { VesselType } from "./types";

/**
 * What a vessel type is like on board. Supplied as data (CMS), never hard-coded in components (CLAUDE.md §6, Q25).
 * Meters describe character, not quality: 1–5.
 */
export type VesselProfile = {
  type: VesselType;
  name: string;
  /** Nickname, e.g. "The private sailing house". */
  short: string;
  /** One honest sentence. */
  line: string;
  facts: [IconName, string][];
  rows: {
    guests: string;
    cabins: string;
    power: string;
    pace: string;
    mooring: string;
    sound: string;
    days: string;
    price: string;
  };
  meters: { intimacy: number; quiet: number; freeItinerary: number; facilities: number; heritage: number };
  sample?: boolean;
};

import type { BookingMode, VesselCabin } from "@/lib/marketplace/vessel";
import { DeckView } from "./DeckView";
import styles from "./marketplace.module.css";

/**
 * DASH-CUS-016, 017, DASH-BND-002, 003: the vessel's decks and the cabin types on each (EXP-002), or a plain note when
 * the vessel has no structured cabin types yet.
 */
export function DeckPlan(props: {
  cabins: VesselCabin[];
  maxGuests: number | null;
  sharedSpaces: string[];
  modes?: Record<string, BookingMode>;
  chooseInForm?: boolean;
}) {
  if (!props.cabins.length)
    return (
      <p className={styles.note}>
        The operator hasn’t listed this vessel’s cabin types yet, so there is no deck view. Ask for an offer to learn what each
        cabin is like.
      </p>
    );
  return <DeckView {...props} />;
}

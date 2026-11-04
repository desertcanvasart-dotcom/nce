import type { BookingMode, VesselCabin, VesselPage } from "@/lib/marketplace/vessel";
import { DeckLayoutView } from "./DeckLayoutView";
import { DeckView } from "./DeckView";
import { VesselMessages } from "./VesselMessages";
import styles from "./marketplace.module.css";

/**
 * DASH-CUS-016, 017, DASH-BND-002, 003: the vessel's decks and the cabin types on each (EXP-002), or a plain note when
 * the vessel has no structured cabin types yet. With a drawn deck plan (9-2b), Nilecruz's drawing and the original.
 */
export function DeckPlan(props: {
  cabins: VesselCabin[];
  maxGuests: number | null;
  sharedSpaces: string[];
  modes?: Record<string, BookingMode>;
  chooseInForm?: boolean;
  plan?: VesselPage["deckPlan"];
}) {
  if (!props.cabins.length)
    return (
      <p className={styles.note}>
        The operator hasn’t listed this vessel’s cabin types yet, so there is no deck view. Ask for an offer to learn what each
        cabin is like.
      </p>
    );
  const { plan, ...rest } = props;
  if (plan?.layout && !props.modes)
    return (
      <VesselMessages>
        <DeckLayoutView
          layout={plan.layout}
          original={plan.original}
          cabins={props.cabins}
          maxGuests={props.maxGuests}
          sharedSpaces={props.sharedSpaces}
        />
      </VesselMessages>
    );
  return (
    <>
      <DeckView {...rest} />
      {plan?.original ? (
        <p>
          <a href={plan.original.url} download={plan.original.name}>
            Download the official deck plan
          </a>
          {plan.original.credit ? ` (${plan.original.credit})` : null}
        </p>
      ) : null}
    </>
  );
}

import { useTranslations } from "next-intl";
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
  const t = useTranslations("vesselPage");
  if (!props.cabins.length) return <p className={styles.note}>{t("deckView.empty")}</p>;
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
    <VesselMessages>
      <DeckView {...rest} />
      {plan?.original ? (
        <p>
          <a href={plan.original.url} download={plan.original.name}>
            {t("deck.download")}
          </a>
          {plan.original.credit ? t("deckView.credit", { credit: plan.original.credit }) : null}
        </p>
      ) : null}
    </VesselMessages>
  );
}

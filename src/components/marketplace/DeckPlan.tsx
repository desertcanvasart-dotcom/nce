import { deckGroups, type VesselCabin } from "@/lib/marketplace/vessel";
import styles from "./marketplace.module.css";

/**
 * DASH-CUS-016, 017, DASH-BND-002, 003: the vessel's decks and the cabin types on each, as a schematic. It never draws
 * numbered cabins or claims to be a floor plan, and says so plainly when the vessel has no structured cabin types.
 */
export function DeckPlan({ cabins }: { cabins: VesselCabin[] }) {
  if (!cabins.length)
    return (
      <p className={styles.note}>
        The operator hasn’t listed this vessel’s cabin types yet, so there is no deck view. Ask for an offer to learn what each
        cabin is like.
      </p>
    );
  return (
    <>
      <p className={styles.schematic}>
        Schematic: not a floor plan. It shows which deck each cabin type is on; your cabin number is assigned by the operator.
      </p>
      <ol className={styles.decks}>
        {deckGroups(cabins).map((g) => (
          <li key={g.deck}>
            <h3>{g.deck} deck</h3>
            <ul>
              {g.cabins.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>
                  <span>
                    {[
                      c.sizeM2 ? `${c.sizeM2} m²` : null,
                      c.bed,
                      `sleeps ${c.maxOccupancy}`,
                      c.view,
                      c.balcony ? "private balcony" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {c.amenities.length ? <small>{c.amenities.join(", ")}</small> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}

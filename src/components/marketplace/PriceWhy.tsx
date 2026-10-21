import { useId } from "react";
import { Link } from "@/i18n/navigation";
import { priceWhy, type PriceFacts } from "@/lib/marketplace/price-why";
import styles from "./PriceWhy.module.css";

/**
 * EXP-001: a price's "Why?" in a native popover (no JavaScript needed where the browser supports popovers); a bottom
 * sheet on phones. The full, illustrative build-up is one link away.
 */
export function PriceWhy({ facts }: { facts: PriceFacts }) {
  const id = `why-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const w = priceWhy(facts);
  return (
    <>
      <button type="button" className={styles.trigger} popoverTarget={id}>
        {w.title}
      </button>
      <div id={id} popover="auto" className={styles.sheet} role="dialog" aria-label={w.title}>
        <p className={styles.title}>{w.title}</p>
        <ul className={styles.lines}>
          {w.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className={styles.label}>Not in this price</p>
        <ul className={styles.lines}>
          {w.notIncluded.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className={styles.more}>
          <Link href="/nile-cruise-prices/">How Nile cruise prices are built</Link>
        </p>
        <button type="button" className={styles.close} popoverTarget={id} popoverTargetAction="hide">
          Close
        </button>
      </div>
    </>
  );
}

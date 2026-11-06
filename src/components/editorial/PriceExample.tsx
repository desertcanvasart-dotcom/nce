import { formatMoney } from "@/components/ds/lib/format";
import { PRICE_EXAMPLE, PRICE_EXAMPLE_TITLE, priceExampleTotal, type PriceStep } from "@/content/price-factors";
import styles from "./PriceExample.module.css";

/** ADR-109: the price page's worked example, per person in euros; the total is calculated from the steps. */
export function PriceExample({ steps = PRICE_EXAMPLE, locale = "en" }: { steps?: PriceStep[]; locale?: string }) {
  const money = (amount: number) => formatMoney({ amount, currency: "EUR" }, locale);
  return (
    <section className={styles.example} aria-labelledby="price-example">
      <h2 id="price-example" className={styles.title}>
        {PRICE_EXAMPLE_TITLE}
      </h2>
      <table className={styles.table}>
        <caption className="visually-hidden">Per person, in euros, including our margin</caption>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.label}>
              <th scope="row">
                {s.label}
                {s.detail ? <span className={styles.detail}> ({s.detail.toLowerCase()})</span> : null}
              </th>
              <td>{i === 0 ? money(s.amount) : `+${money(s.amount)}`}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total, per person</th>
            <td>{money(priceExampleTotal(steps))}</td>
          </tr>
        </tfoot>
      </table>
      <p className={styles.note}>All prices we publish and quote already include our margin.</p>
    </section>
  );
}

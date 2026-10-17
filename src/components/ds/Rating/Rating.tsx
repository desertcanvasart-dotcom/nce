import { useTranslations } from "next-intl";
import { Icon } from "../Icon/Icon";
import styles from "./Rating.module.css";

export type RatingProps = {
  /** 0–5, one decimal. */
  value: number;
  /** Number of verified guest reviews behind the value. */
  count: number;
};

/**
 * Star rating with score and review count (COMP-Rating).
 * Only for verified guest reviews (ADR-009): `count` is required, so stars can never appear without the reviews behind them.
 */
export function Rating({ value, count }: RatingProps) {
  const t = useTranslations("ds.rating");
  return (
    <span className={styles.rating}>
      <span className={styles.stars} role="img" aria-label={t("outOf", { value: value.toFixed(1) })}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name="star" filled={value >= i - 0.25} />
        ))}
      </span>
      <b>{value.toFixed(1)}</b>
      <span>{t("reviews", { count })}</span>
    </span>
  );
}

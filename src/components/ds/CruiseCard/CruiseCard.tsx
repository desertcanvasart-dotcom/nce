import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, type BadgeProps } from "../Badge/Badge";
import { Icon, type IconName } from "../Icon/Icon";
import { formatMoney, formatNights } from "../lib/format";
import { vesselIcon, type Money, type SceneTime, type VesselType } from "../lib/types";
import { Media, type MediaProps } from "../Media/Media";
import { Rating } from "../Rating/Rating";
import { CompareToggle, SaveButton } from "./CardToggles";
import styles from "./CruiseCard.module.css";

export type CruiseCardProps = {
  name: string;
  /** Vessel page for this sailing. */
  href: string;
  vessel: VesselType;
  /** Stops in order. */
  route?: string[];
  nights?: number;
  /** Maximum guests on board: the honest size signal, always shown when known. */
  guests?: number;
  /** Published Nilecruz evaluation, 0–100 (ADR-009). */
  evaluation?: number;
  /** Verified guest reviews only; never external ratings (ADR-009). */
  rating?: { value: number; count: number };
  /** Public "from" price per person (ADR-025). Leave out for information-only listings. */
  price?: Money;
  /** Five or fewer, the ones that differ. Each is labelled for screen readers. */
  amenities?: IconName[];
  badges?: { label: string; tone?: BadgeProps["tone"]; icon?: IconName }[];
  image?: MediaProps["image"];
  time?: SceneTime;
  saved?: boolean;
  compared?: boolean;
  onSave?: (saved: boolean) => void;
  onCompare?: (on: boolean) => void;
};

/** Listing card for one sailing (COMP-CruiseCard). */
export function CruiseCard(p: CruiseCardProps) {
  const t = useTranslations("ds");
  const locale = useLocale();
  const id = useId();
  return (
    <article className={styles.card} aria-labelledby={id}>
      <div className={styles.top}>
        <Media
          image={p.image}
          time={p.time ?? "dusk"}
          vessel={p.vessel}
          sizes="(max-width: 760px) 100vw, 400px"
          className={styles.media}
        />
        {p.badges?.length ? (
          <div className={styles.badges}>
            {p.badges.map((b) => (
              <Badge key={b.label} tone={b.tone ?? "media"} icon={b.icon}>
                {b.label}
              </Badge>
            ))}
          </div>
        ) : null}
        <SaveButton name={p.name} saved={p.saved} onSave={p.onSave} />
      </div>
      <div className={styles.body}>
        <p className={styles.eyebrow}>
          <Icon name={vesselIcon[p.vessel]} />
          {t(`vesselTypes.${p.vessel}`)}
        </p>
        <h3 className={styles.title} id={id}>
          <Link href={p.href} className={styles.titleLink}>
            {p.name}
          </Link>
        </h3>
        {p.route?.length ? (
          <ol className={styles.route} aria-label={t("cruiseCard.route")}>
            {p.route.map((r, i) => (
              <li key={`${r}-${i}`}>{r}</li>
            ))}
          </ol>
        ) : null}
        <div className={styles.meta}>
          {p.nights ? (
            <span>
              <Icon name="clock" />
              {formatNights(p.nights, locale)}
            </span>
          ) : null}
          {p.guests ? (
            <span>
              <Icon name="users" />
              {t("cruiseCard.guestsMax", { count: p.guests })}
            </span>
          ) : null}
          {p.evaluation !== undefined ? (
            <span className={styles.score}>{t("cruiseCard.evaluation", { score: Math.round(p.evaluation) })}</span>
          ) : null}
          {p.rating ? <Rating value={p.rating.value} count={p.rating.count} /> : null}
        </div>
        {p.amenities?.length ? (
          <ul className={styles.amenities} aria-label={t("cruiseCard.onBoard")}>
            {p.amenities.slice(0, 5).map((a) => (
              <li key={a} title={t(`amenities.${a}`)}>
                <Icon name={a} label={t(`amenities.${a}`)} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className={styles.foot}>
          {p.price ? (
            <div className={styles.price}>
              <small>{t("cruiseCard.fromPerPerson")}</small>
              <b>{formatMoney(p.price, locale)}</b>
            </div>
          ) : (
            <div className={styles.price}>
              <small>{t("cruiseCard.pricesInPreparation")}</small>
            </div>
          )}
          <CompareToggle compared={p.compared} onCompare={p.onCompare} />
        </div>
      </div>
    </article>
  );
}

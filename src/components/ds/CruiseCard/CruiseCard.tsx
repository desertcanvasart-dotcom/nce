import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, type BadgeProps } from "../Badge/Badge";
import { Icon, type IconName } from "../Icon/Icon";
import { formatMoney, formatNights } from "../lib/format";
import { propulsionIcon, vesselIcon, type Money, type Propulsion, type SceneTime, type VesselType } from "../lib/types";
import { Media, type MediaProps } from "../Media/Media";
import { Rating } from "../Rating/Rating";
import { CompareToggle, SaveButton } from "./CardToggles";
import styles from "./CruiseCard.module.css";

export type CruiseCardProps = {
  name: string;
  /** Vessel page for this sailing. */
  href: string;
  vessel: VesselType;
  /** What drives it (motor, wind or steam), when its data says: a badge with an icon and a word. */
  propulsion?: Propulsion;
  /** Stops in order. */
  route?: string[];
  nights?: number;
  /** Maximum guests on board: the honest size signal, always shown when known. */
  guests?: number;
  /** Published Nilecruz evaluation, 0–100 (ADR-009). */
  evaluation?: number;
  /** Verified guest reviews only; never external ratings (ADR-009). */
  rating?: { value: number; count: number };
  /**
   * ADR-109: the approved public starting price per person in euros, already including Nilecruz's margin: "from" one
   * figure, or a typical band. Leave it out and the card says "Price on request".
   */
  price?: ({ from: Money } | { min: Money; max: Money }) & {
    /** False: the figure isn't yet confirmed to include our margin, so the card doesn't say it does. */
    margin?: boolean;
  };
  /** The vessel can't be booked through Nilecruz: "Booking unavailable through us" instead of a price. */
  unavailable?: boolean;
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
          {p.propulsion ? <Badge icon={propulsionIcon[p.propulsion]}>{t(`propulsion.${p.propulsion}`)}</Badge> : null}
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
          <div className={styles.price}>
            {p.unavailable ? (
              <p>
                <b className={styles.onRequest}>{t("cruiseCard.unavailable")}</b>
              </p>
            ) : p.price ? (
              <p>
                {"from" in p.price
                  ? t.rich(p.price.margin === false ? "cruiseCard.fromGuide" : "cruiseCard.from", {
                      price: formatMoney(p.price.from, locale),
                      b: (c) => <b>{c}</b>,
                    })
                  : t.rich(p.price.margin === false ? "cruiseCard.bandGuide" : "cruiseCard.band", {
                      min: formatMoney(p.price.min, locale),
                      max: formatMoney(p.price.max, locale),
                      b: (c) => <b>{c}</b>,
                    })}
              </p>
            ) : (
              <p>
                <b className={styles.onRequest}>{t("cruiseCard.onRequest")}</b>
              </p>
            )}
          </div>
          <CompareToggle compared={p.compared} onCompare={p.onCompare} />
        </div>
      </div>
    </article>
  );
}

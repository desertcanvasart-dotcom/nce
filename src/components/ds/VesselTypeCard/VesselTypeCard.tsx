import { useTranslations } from "next-intl";
import { Button } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import type { VesselType } from "../lib/types";
import { SampleFlag } from "../SampleFlag/SampleFlag";
import { VesselArt } from "../VesselArt/VesselArt";
import styles from "./VesselTypeCard.module.css";

export type VesselTypeCardProps = {
  type: VesselType;
  title: string;
  eyebrow: string;
  description: string;
  facts: [IconName, string][];
  href: string;
  cta?: string;
  sample?: boolean;
};

/** Explains one way to sail: illustration, nickname, name, one honest sentence, three facts and a link (COMP-VesselTypeCard). Show the three together. */
export function VesselTypeCard({ type, title, eyebrow, description, facts, href, cta, sample }: VesselTypeCardProps) {
  const t = useTranslations("ds.vesselTypeCard");
  return (
    <article className={styles.card}>
      <div className={styles.art}>
        <VesselArt type={type} decorative />
      </div>
      <div className={styles.body}>
        {sample ? <SampleFlag /> : null}
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.line}>{description}</p>
        <ul className={styles.facts}>
          {facts.map(([icon, text]) => (
            <li key={text}>
              <Icon name={icon} />
              {text}
            </li>
          ))}
        </ul>
        <Button variant="link" icon="arrow-right" href={href}>
          {cta ?? t("cta")}
        </Button>
      </div>
    </article>
  );
}

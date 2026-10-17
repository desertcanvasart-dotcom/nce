import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../Button/Button";
import type { SceneTime, VesselType } from "../lib/types";
import { Media, type MediaProps } from "../Media/Media";
import styles from "./ExperienceCard.module.css";

export type ExperienceCardProps = {
  title: string;
  description?: ReactNode;
  image?: MediaProps["image"];
  time?: SceneTime;
  /** Boat in the placeholder scene; none by default (the design system's felucca default is removed, ADR-008). */
  vessel?: VesselType | null;
  temple?: boolean;
  href: string;
  cta?: string;
};

/** Portrait image, uppercase serif title, two-line description and an outline "See details" button (COMP-ExperienceCard). Use three or four in a row. */
export function ExperienceCard({
  title,
  description,
  image,
  time = "day",
  vessel = null,
  temple,
  href,
  cta,
}: ExperienceCardProps) {
  const t = useTranslations("ds.experienceCard");
  return (
    <article className={styles.exp}>
      <Media
        image={image}
        time={time}
        vessel={vessel}
        temple={temple}
        sizes="(max-width: 760px) 100vw, 300px"
        className={styles.media}
      />
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.text}>{description}</p> : null}
      <Button variant="outline" size="sm" href={href} className={styles.btn}>
        {cta ?? t("seeDetails")}
      </Button>
    </article>
  );
}

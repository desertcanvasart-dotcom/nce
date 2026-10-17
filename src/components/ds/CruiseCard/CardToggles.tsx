"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon/Icon";
import styles from "./CruiseCard.module.css";

/** Save (heart) and Compare controls. State is local until saved cruises (PROPOSED-012) and the compare tray (EXP-004) exist. */
export function SaveButton({
  name,
  saved: initial = false,
  onSave,
}: {
  name: string;
  saved?: boolean;
  onSave?: (saved: boolean) => void;
}) {
  const t = useTranslations("ds.cruiseCard");
  const [saved, setSaved] = useState(initial);
  return (
    <button
      type="button"
      className={styles.save}
      aria-pressed={saved}
      aria-label={saved ? t("remove", { name }) : t("save", { name })}
      onClick={() => {
        setSaved(!saved);
        onSave?.(!saved);
      }}
    >
      <Icon name="heart" />
    </button>
  );
}

export function CompareToggle({
  compared: initial = false,
  onCompare,
}: {
  compared?: boolean;
  onCompare?: (on: boolean) => void;
}) {
  const t = useTranslations("ds.cruiseCard");
  const [on, setOn] = useState(initial);
  return (
    <label className={styles.compare}>
      <input
        type="checkbox"
        checked={on}
        onChange={() => {
          setOn(!on);
          onCompare?.(!on);
        }}
      />
      {t("compare")}
    </label>
  );
}

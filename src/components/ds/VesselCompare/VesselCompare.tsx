"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import { vesselIcon, type VesselType } from "../lib/types";
import type { VesselProfile } from "../lib/vessel-profile";
import { SampleFlag } from "../SampleFlag/SampleFlag";
import { VesselArt } from "../VesselArt/VesselArt";
import styles from "./VesselCompare.module.css";

export type VesselCompareProps = {
  /** In display order; usually sail, motor, steam. */
  profiles: VesselProfile[];
  defaultType?: VesselType;
};

const ROWS: [IconName, keyof VesselProfile["rows"]][] = [
  ["users", "guests"],
  ["bed", "cabins"],
  ["compass", "power"],
  ["clock", "pace"],
  ["anchor", "mooring"],
  ["quiet", "sound"],
  ["sunrise", "days"],
  ["ruler", "price"],
];
const METERS: (keyof VesselProfile["meters"])[] = ["intimacy", "quiet", "freeItinerary", "facilities", "heritage"];

/**
 * Comparison of the vessel types (COMP-VesselCompare): tabs with an illustration, five meters and a fact list,
 * or all side by side. Arrow keys move between tabs (A11Y-009). Meters show character, not quality.
 */
export function VesselCompare({ profiles, defaultType }: VesselCompareProps) {
  const t = useTranslations("ds.vesselCompare");
  const id = useId();
  const [cur, setCur] = useState<VesselType>(defaultType ?? profiles[0]?.type ?? "sail");
  const [all, setAll] = useState(false);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const v = profiles.find((p) => p.type === cur) ?? profiles[0];
  if (!v) return null;
  const sample = profiles.some((p) => p.sample);

  function onKey(ev: KeyboardEvent) {
    const i = profiles.findIndex((p) => p.type === cur);
    let next = -1;
    if (ev.key === "ArrowRight") next = (i + 1) % profiles.length;
    else if (ev.key === "ArrowLeft") next = (i - 1 + profiles.length) % profiles.length;
    else if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = profiles.length - 1;
    if (next < 0) return;
    ev.preventDefault();
    const type = profiles[next]!.type;
    setCur(type);
    setAll(false);
    tabs.current[type]?.focus();
  }

  return (
    <section className={styles.vc}>
      <div className={styles.bar}>
        <div className={styles.tabs} role="tablist" aria-label={t("tablist")}>
          {profiles.map((p) => (
            <button
              key={p.type}
              ref={(el) => {
                tabs.current[p.type] = el;
              }}
              role="tab"
              type="button"
              id={`${id}-tab-${p.type}`}
              aria-controls={`${id}-panel`}
              className={styles.tab}
              aria-selected={!all && p.type === cur}
              tabIndex={p.type === cur ? 0 : -1}
              onKeyDown={onKey}
              onClick={() => {
                setCur(p.type);
                setAll(false);
              }}
            >
              <Icon name={vesselIcon[p.type]} />
              {p.name}
            </button>
          ))}
        </div>
        <div className={styles.barEnd}>
          {sample ? <SampleFlag /> : null}
          <Button variant={all ? "primary" : "ghost"} size="sm" aria-pressed={all} onClick={() => setAll(!all)}>
            {all ? t("oneAtATime") : t("compareAll", { count: profiles.length })}
          </Button>
        </div>
      </div>
      {all ? (
        <div className={styles.table} role="table" aria-label={t("tableLabel")}>
          <div role="row" className={`${styles.tr} ${styles.head}`}>
            <span role="columnheader" />
            {profiles.map((p) => (
              <span key={p.type} role="columnheader">
                <VesselArt type={p.type} decorative className={styles.mini} />
                {p.name}
              </span>
            ))}
          </div>
          {ROWS.map(([icon, key]) => (
            <div role="row" key={key} className={styles.tr}>
              <span role="rowheader">
                <Icon name={icon} />
                {t(`rows.${key}`)}
              </span>
              {profiles.map((p) => (
                <span key={p.type} role="cell">
                  {p.rows[key]}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.one} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${v.type}`} key={v.type}>
          <div className={styles.stage}>
            <VesselArt type={v.type} className={styles.sailIn} />
            <p className={styles.short}>{v.short}</p>
          </div>
          <div className={styles.info}>
            <h3 className={styles.title}>{v.name}</h3>
            <p className={styles.line}>{v.line}</p>
            <div className={styles.meters}>
              {METERS.map((m) => (
                <div className={styles.meter} key={m}>
                  <span>{t(`meters.${m}`)}</span>
                  <span
                    className={styles.cells}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={5}
                    aria-valuenow={v.meters[m]}
                    aria-label={t(`meters.${m}`)}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i
                        key={i}
                        className={i <= v.meters[m] ? styles.cellOn : undefined}
                        style={{ transitionDelay: `${i * 40}ms` }}
                      />
                    ))}
                  </span>
                  <b>{v.meters[m]}/5</b>
                </div>
              ))}
            </div>
            <dl className={styles.dl}>
              {ROWS.map(([icon, key]) => (
                <div key={key} className={styles.dlRow}>
                  <dt>
                    <Icon name={icon} />
                    {t(`rows.${key}`)}
                  </dt>
                  <dd>{v.rows[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

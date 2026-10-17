"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import { cx } from "../lib/cx";
import { formatDate } from "../lib/format";
import { Stepper } from "../Stepper/Stepper";
import { Calendar } from "./Calendar";
import styles from "./CruiseSearch.module.css";

export type SearchRoute = { id: string; label: string; sub?: string; /** Real departure dates, yyyy-mm-dd. */ dates: string[] };
export type SearchVessel = { id: string; label: string; sub?: string; icon?: IconName };
export type SearchQuery = { route: string; vessel: string; date: string | null; adults: number; childAges: number[] };

export type CruiseSearchProps = {
  routes: SearchRoute[];
  /** The first entry is usually "Any vessel". */
  vessels: SearchVessel[];
  defaultVessel?: number;
  /** Where the search goes (a /cruises/ listing). Submits as a GET form, so it also works without JavaScript. */
  action: string;
  onMedia?: boolean;
  cta?: string;
  /** Called on a valid search (client parents only). */
  onSearch?: (q: SearchQuery) => void;
  /** Number of matching departures, when the caller knows it; never invented (ADR-007). */
  matchCount?: number;
};

const MAX_ADULTS = 8;
const MAX_CHILDREN = 4;
const CHILD_AGES = Array.from({ length: 12 }, (_, i) => i); // 0–11; 12 and over count as adults (ADR-012)

/**
 * Floating search: route, vessel, departure calendar with real sailing dates, and guests with each child's age
 * (COMP-CruiseSearch, ADR-012/018). Popovers close on Escape or an outside click.
 */
export function CruiseSearch({
  routes,
  vessels,
  defaultVessel = 0,
  action,
  onMedia,
  cta,
  onSearch,
  matchCount,
}: CruiseSearchProps) {
  const t = useTranslations("ds.cruiseSearch");
  const locale = useLocale();
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [route, setRoute] = useState(0);
  const [vessel, setVessel] = useState(defaultVessel);
  const [date, setDate] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [ages, setAges] = useState<(number | null)[]>([]);
  const [agesError, setAgesError] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const off = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(null);
    };
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const r = routes[route];
  const v = vessels[vessel];
  if (!r || !v) return null;
  const guests = adults + ages.length;

  const setChildren = (n: number) =>
    setAges((a) => (n > a.length ? [...a, ...Array<null>(n - a.length).fill(null)] : a.slice(0, n)));

  const field = (key: string, label: string, value: string, icon: IconName, pop: ReactNode, alignRight?: boolean) => (
    <div className={styles.fieldWrap} key={key}>
      <button
        type="button"
        className={styles.field}
        aria-expanded={open === key}
        aria-controls={`${id}-${key}`}
        onClick={() => setOpen(open === key ? null : key)}
      >
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>
          <Icon name={icon} />
          <span>{value}</span>
          <Icon name="chevron-down" className={styles.chev} />
        </span>
      </button>
      {open === key ? (
        <div className={cx(styles.pop, alignRight && styles.popRight)} role="dialog" aria-label={label} id={`${id}-${key}`}>
          {pop}
        </div>
      ) : null}
    </div>
  );

  const list = <T extends { label: string; sub?: string; icon?: IconName }>(
    items: T[],
    cur: number,
    pick: (i: number) => void,
    label: string,
  ) => (
    <div role="listbox" aria-label={label}>
      {items.map((it, i) => (
        <button
          key={it.label}
          type="button"
          role="option"
          aria-selected={i === cur}
          className={styles.opt}
          onClick={() => {
            pick(i);
            setOpen(null);
            setSearched(false);
          }}
        >
          <span>
            {it.icon ? <Icon name={it.icon} /> : null} {it.label}
          </span>
          {it.sub ? <small>{it.sub}</small> : null}
          {i === cur ? <Icon name="check" /> : null}
        </button>
      ))}
    </div>
  );

  function submit(ev: React.FormEvent) {
    if (ages.some((a) => a === null)) {
      ev.preventDefault();
      setAgesError(true);
      setOpen("guests");
      return;
    }
    setAgesError(false);
    setSearched(true);
    setOpen(null);
    if (onSearch) {
      ev.preventDefault();
      onSearch({ route: r!.id, vessel: v!.id, date, adults, childAges: ages as number[] });
    }
  }

  return (
    <form
      ref={ref}
      className={cx(styles.search, !onMedia && styles.onSurface)}
      role="search"
      action={action}
      method="get"
      onSubmit={submit}
    >
      <input type="hidden" name="route" value={r.id} />
      <input type="hidden" name="vessel" value={v.id} />
      {date ? <input type="hidden" name="date" value={date} /> : null}
      <input type="hidden" name="adults" value={adults} />
      {ages.length ? <input type="hidden" name="ages" value={ages.join(",")} /> : null}

      {field(
        "route",
        t("route"),
        r.label,
        "route",
        list(routes, route, (i) => (setRoute(i), setDate(null)), t("route")),
      )}
      {field("vessel", t("vessel"), v.label, v.icon ?? "compass", list(vessels, vessel, setVessel, t("vessel")))}
      {field(
        "date",
        t("departure"),
        date ? formatDate(date, locale) : t("anyDate"),
        "calendar",
        <Calendar
          sailingDates={r.dates}
          value={date}
          onPick={(d) => {
            setDate(d);
            setOpen(null);
            setSearched(false);
          }}
        />,
      )}
      {field(
        "guests",
        t("guests"),
        t("guestCount", { count: guests }),
        "users",
        <div>
          <div className={styles.stepRow}>
            <span>
              {t("adults")}
              <small>{t("adultsHint")}</small>
            </span>
            <Stepper label={t("adults")} min={1} max={MAX_ADULTS} value={adults} onChange={setAdults} />
          </div>
          <div className={styles.stepRow}>
            <span>
              {t("children")}
              <small>{t("childrenHint")}</small>
            </span>
            <Stepper label={t("children")} min={0} max={MAX_CHILDREN} value={ages.length} onChange={setChildren} />
          </div>
          {ages.map((age, i) => (
            <label key={i} className={styles.ageRow}>
              <span>{t("childAge", { n: i + 1 })}</span>
              <select
                value={age ?? ""}
                aria-invalid={agesError && age === null ? true : undefined}
                onChange={(e) => {
                  const next = [...ages];
                  next[i] = e.target.value === "" ? null : Number(e.target.value);
                  setAges(next);
                }}
              >
                <option value="">{t("chooseAge")}</option>
                {CHILD_AGES.map((a) => (
                  <option key={a} value={a}>
                    {a === 0 ? t("underOne") : t("years", { count: a })}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {agesError ? (
            <p className={styles.error} role="alert">
              {t("agesRequired")}
            </p>
          ) : null}
        </div>,
        true,
      )}
      <Button type="submit" variant="primary" size="lg" className={styles.go} icon="arrow-right">
        {cta ?? t("cta")}
      </Button>
      {searched && matchCount !== undefined ? (
        <p className={styles.note} role="status">
          <Icon name="check" />
          {t("matches", { count: matchCount, vessel: v.label.toLowerCase(), route: r.label })}
        </p>
      ) : null}
    </form>
  );
}

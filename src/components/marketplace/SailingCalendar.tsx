"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ds/Icon/Icon";
import { cx } from "@/components/ds/lib/cx";
import { formatNights } from "@/components/ds/lib/format";
import { Link } from "@/i18n/navigation";
import {
  calendarMonths,
  monthDays,
  nightsOnBoard,
  type CalendarSailing,
  type PatternLine,
  type SailingStatus,
} from "@/lib/marketplace/sailing-calendar";
import styles from "./SailingCalendar.module.css";

export type SailingCalendarProps = {
  sailings: CalendarSailing[];
  patterns: PatternLine[];
  /** Usual sailing days with no dates to draw: listed when the calendar has nothing else to show. */
  usual?: PatternLine[];
  /** Today in Cairo (yyyy-mm-dd), from the server, so the page and the browser agree. */
  today: string;
  bookable: boolean;
  /** The vessel's reserve page, without a query. */
  reserve: string;
  /** The vessel's "Ask for an offer" page, without a query: a date is asked about with its itinerary and day. */
  ask: string;
};

// Months shown before "See more dates": the next three, this one first.
const FIRST_MONTHS = 3;

const STATUS_ICON = { confirmed: "check", pattern: "clock", cancelled: "close" } as const;
const ARROW = { south: "↓", north: "↑" } as const;

/**
 * The vessel's sailing dates on a month calendar, replacing a list of lines. Each departure day carries its length,
 * its direction (the arrow and the line under the nights on board) and its status: confirmed departures are filled,
 * dates expected from the weekly pattern are outlined in dashes, cancelled ones are struck through. Choosing a day
 * shows its sailings in words beside the month, with the way to book (confirmed) or to ask (everything else).
 */
export function SailingCalendar({
  sailings,
  patterns,
  usual = [],
  today,
  bookable,
  reserve,
  ask: askPage,
}: SailingCalendarProps) {
  const t = useTranslations("sailingCalendar");
  const locale = useLocale();
  const tag = locale === "en" ? "en-GB" : locale;
  const months = calendarMonths(sailings, today);
  // A month opens on its first confirmed sailing, else its first sailing that isn't cancelled.
  const pickIn = (m: string) => {
    const own = sailings.filter((s) => s.departsOn.startsWith(m));
    return (own.find((s) => s.status === "confirmed") ?? own.find((s) => s.status !== "cancelled") ?? own[0])?.departsOn ?? null;
  };
  // The calendar opens on this month (the months run from today's), on its first sailing.
  const start = months[0];
  const [month, setMonth] = useState(() => start ?? today.slice(0, 7));
  const [picked, setPicked] = useState(() => (start ? pickIn(start) : null));
  const [more, setMore] = useState(false);

  const byDay = new Map<string, CalendarSailing[]>();
  for (const s of sailings) byDay.set(s.departsOn, [...(byDay.get(s.departsOn) ?? []), s]);
  const nights = nightsOnBoard(sailings);

  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: "UTC", ...o });
  const at = (d: string) => new Date(`${d}T12:00:00Z`);
  const longDay = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDay = fmt({ weekday: "short", day: "numeric", month: "short" });
  const dated = fmt({ day: "numeric", month: "short", year: "numeric" });
  const monthName = fmt({ month: "long" });
  const monthShort = fmt({ month: "short" });
  const weekday = fmt({ weekday: "short" });
  const weekdayNarrow = fmt({ weekday: "narrow" });
  const weekdayLong = fmt({ weekday: "long" });
  const dayList = new Intl.ListFormat(tag, { type: "conjunction" });
  // 2024-01-01 was a Monday: ISO weekday n is 2024-01-0n.
  const isoDay = (n: number) => at(`2024-01-0${n}`);
  const status = (s: SailingStatus) => t(`status.${s}`);
  const route = (s: { origin: string; destination: string }) => `${s.origin} → ${s.destination}`;
  const sailingWords = (s: CalendarSailing) =>
    t("sailingLabel", { route: route(s), nights: formatNights(s.nights, locale), status: status(s.status) });

  // The weekly timetable: each itinerary's weekdays, its route and length, and the periods it runs in when known.
  const timetable = (lines: PatternLine[]) => (
    <ul className={styles.timetable}>
      {lines.map((p) => (
        <li key={p.code} className={cx(p.heading && styles[p.heading])}>
          <span className={styles.stamps} aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span key={n} className={cx(styles.stamp, p.days.includes(n) && styles.on)}>
                {weekdayNarrow.format(isoDay(n))}
              </span>
            ))}
          </span>
          <span className={styles.line}>
            <strong>{dayList.format(p.days.map((n) => weekdayLong.format(isoDay(n))))}</strong>
            <span>{t("routeLine", { route: route(p), nights: formatNights(p.nights, locale) })}</span>
            {p.periods.length ? (
              <span className={styles.periods}>
                {p.periods
                  .map((r) => t("period", { from: dated.format(at(r.startsOn)), to: dated.format(at(r.endsOn)) }))
                  .join(" · ")}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );

  if (!months.length) {
    return (
      <div className={styles.calendar}>
        {usual.length ? (
          <div className={styles.weekly}>
            <h3 className={styles.kicker}>{t("patternTitle")}</h3>
            {timetable(usual)}
            <p className={styles.empty}>{t("emptyUsual")}</p>
          </div>
        ) : (
          <p className={styles.empty}>{t("empty")}</p>
        )}
      </div>
    );
  }

  const i = Math.max(0, months.indexOf(month));
  const { offset, days } = monthDays(months[i]!);
  const go = (to: number) => {
    const m = months[to]!;
    setMonth(m);
    setPicked(pickIn(m));
  };
  const chosen = picked ? (byDay.get(picked) ?? []) : [];
  const ask = (s: CalendarSailing) => `${askPage}?${new URLSearchParams({ itinerary: s.code, date: s.departsOn }).toString()}`;
  const shown = more || i >= FIRST_MONTHS ? months : months.slice(0, FIRST_MONTHS);
  const monthSailings = sailings.filter((s) => s.departsOn.startsWith(months[i]!));

  return (
    <div className={styles.calendar}>
      {patterns.length ? (
        <div className={styles.weekly}>
          <h3 className={styles.kicker}>{t("patternTitle")}</h3>
          {timetable(patterns)}
          <p className={styles.caution}>
            <Icon name="info" className={styles.cautionIcon} />
            {t("patternNote")}
          </p>
        </div>
      ) : null}

      <nav className={styles.strip} aria-label={t("months")}>
        <ol>
          {shown.map((m, n) => {
            const count = sailings.filter((s) => s.departsOn.startsWith(m) && s.status !== "cancelled").length;
            return (
              <li key={m}>
                <button type="button" className={styles.tab} aria-current={n === i ? "true" : undefined} onClick={() => go(n)}>
                  {/* The name is the hidden words; the short month and count are what sighted visitors read (WCAG 2.5.3). */}
                  <span className="visually-hidden">{`${monthName.format(at(`${m}-01`))} ${m.slice(0, 4)}: ${t("monthCount", { count })}`}</span>
                  <span aria-hidden="true">{monthShort.format(at(`${m}-01`))}</span>
                  <span className={styles.count} aria-hidden="true">
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {months.length > FIRST_MONTHS && i < FIRST_MONTHS ? (
          <button type="button" className={styles.more} aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? t("seeFewer") : t("seeMore")}
          </button>
        ) : null}
      </nav>

      <div className={styles.board}>
        <div className={styles.sheet}>
          <div className={styles.head}>
            <button
              type="button"
              className={styles.arrow}
              disabled={i === 0}
              aria-label={t("prevMonth")}
              onClick={() => go(i - 1)}
            >
              <Icon name="chevron-left" />
            </button>
            <h3 className={styles.month} aria-live="polite">
              {t.rich("monthHead", {
                month: monthName.format(at(`${months[i]}-01`)),
                year: months[i]!.slice(0, 4),
                y: (chunks) => <span>{chunks}</span>,
              })}
            </h3>
            <button
              type="button"
              className={styles.arrow}
              disabled={i === months.length - 1}
              aria-label={t("nextMonth")}
              onClick={() => go(i + 1)}
            >
              <Icon name="chevron-right" />
            </button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span key={n}>{weekday.format(isoDay(n))}</span>
            ))}
          </div>
          {/* On a phone: the month's sailings as a list of days to choose from, instead of a squeezed grid. */}
          <ul className={styles.dayList}>
            {monthSailings.length ? (
              [...new Set(monthSailings.map((s) => s.departsOn))].map((d) => {
                const here = byDay.get(d) ?? [];
                return (
                  <li key={d}>
                    <button type="button" aria-pressed={picked === d} onClick={() => setPicked(d)}>
                      <strong>{shortDay.format(at(d))}</strong>
                      {here.map((s) => (
                        <span key={s.code} className={cx(styles.flag, styles[s.status], s.heading && styles[s.heading])}>
                          {s.heading ? <span aria-hidden="true">{ARROW[s.heading]} </span> : null}
                          {route(s)}, {formatNights(s.nights, locale)} · {status(s.status)}
                        </span>
                      ))}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className={styles.hint}>{t("none")}</li>
            )}
          </ul>
          <div className={styles.grid} style={{ ["--offset" as string]: offset }}>
            {days.map((d) => {
              const here = byDay.get(d) ?? [];
              const night = nights.get(d);
              const ribbon = night
                ? cx(styles.ribbon, styles[night.heading ?? "level"], night.status === "pattern" && styles.dashed)
                : undefined;
              const n = Number(d.slice(8));
              if (!here.length)
                return (
                  <div key={d} className={cx(styles.day, d <= today && styles.past)}>
                    <span className={styles.num}>{n}</span>
                    {ribbon ? <i className={ribbon} /> : null}
                  </div>
                );
              return (
                <button
                  key={d}
                  type="button"
                  className={cx(styles.day, styles.sails)}
                  aria-pressed={picked === d}
                  onClick={() => setPicked(d)}
                >
                  <span className="visually-hidden">{`${longDay.format(at(d))}: ${here.map(sailingWords).join("; ")}`}</span>
                  <span className={styles.num} aria-hidden="true">
                    {n}
                  </span>
                  <span className={styles.flags} aria-hidden="true">
                    {here.map((s) => (
                      <span key={s.code} className={cx(styles.flag, styles[s.status], s.heading && styles[s.heading])}>
                        {s.heading ? <span aria-hidden="true">{ARROW[s.heading]}</span> : null}
                        {t("nightsShort", { n: s.nights })}
                        <span className={styles.route}>
                          {s.origin.slice(0, 3)}–{s.destination.slice(0, 3)}
                        </span>
                      </span>
                    ))}
                  </span>
                  {ribbon ? <i className={ribbon} /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.manifest} aria-live="polite">
          {picked && chosen.length ? (
            <>
              <p className={styles.kicker}>{longDay.format(at(picked))}</p>
              <ul className={styles.entries}>
                {chosen.map((s) => (
                  <li key={s.code} className={cx(styles.entry, styles[s.status])}>
                    <p className={styles.badge}>
                      <Icon name={STATUS_ICON[s.status]} />
                      {status(s.status)}
                    </p>
                    <p className={styles.entryRoute}>
                      {s.heading ? <span aria-hidden="true">{ARROW[s.heading]} </span> : null}
                      {route(s)}
                    </p>
                    <dl className={styles.facts}>
                      <div>
                        <dt>{t("length")}</dt>
                        <dd>{formatNights(s.nights, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t("checkIn")}</dt>
                        <dd>
                          <time dateTime={s.departsOn}>{shortDay.format(at(s.departsOn))}</time>, {s.origin}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("checkOut")}</dt>
                        <dd>
                          <time dateTime={s.returnsOn}>{shortDay.format(at(s.returnsOn))}</time>, {s.destination}
                        </dd>
                      </div>
                    </dl>
                    <p className={styles.why}>
                      {s.status === "confirmed" ? (bookable ? t("why.confirmed") : t("why.confirmedInfo")) : t(`why.${s.status}`)}
                    </p>
                    {s.status === "confirmed" && bookable && s.id ? (
                      <Link
                        className={styles.book}
                        href={`${reserve}?${new URLSearchParams({ itinerary: s.code, dep: s.id }).toString()}`}
                      >
                        {t("book")}
                      </Link>
                    ) : s.status !== "cancelled" ? (
                      <Link className={styles.askLink} href={ask(s)}>
                        {t("ask")}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.hint}>{t("none")}</p>
          )}
        </div>
      </div>

      <ul className={styles.legend}>
        <li>
          <span className={cx(styles.key, styles.confirmed)} /> {status("confirmed")}
        </li>
        <li>
          <span className={cx(styles.key, styles.pattern)} /> {t("legend.pattern")}
        </li>
        <li>
          <span className={cx(styles.key, styles.cancelled)} /> {status("cancelled")}
        </li>
        <li>
          <span className={cx(styles.lineKey, styles.south)} /> {ARROW.south} {t("legend.south")}
        </li>
        <li>
          <span className={cx(styles.lineKey, styles.north)} /> {ARROW.north} {t("legend.north")}
        </li>
      </ul>
      <p className={styles.footnote}>{t("legend.nights")}</p>
    </div>
  );
}

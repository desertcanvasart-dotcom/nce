import { deadlineRule, paymentDeadline, type PremiumPeriod } from "@/lib/payments/deadlines";
import { CalendarKeys } from "./CalendarKeys";
import styles from "./SeasonCalendar.module.css";

const DAY = 86_400_000;
const add = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
// One formatter for every date (PERF-003): creating one per call made the 365 labels the page's slowest work.
const LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const long = (d: string) => LONG.format(new Date(`${d}T12:00:00Z`));
const SEASON = {
  festive: "Christmas and New Year",
  premium: "a premium period",
  winter: "the main season",
  summer: "summer",
} as const;

/** What the calendar says for a sailing date, booked today (EXP-006), from the same rules as booking (ADR-027). */
export function dayText(today: string, day: string, periods: PremiumPeriod[]): string {
  if (day <= today) return `${long(day)} has passed.`;
  const r = deadlineRule(day, periods);
  const d = paymentDeadline(today, day, periods);
  return `Sail on ${long(day)}: ${r.period ?? SEASON[r.rule]}. Book today and pay in full by ${long(d.dueOn)}.`;
}

/** This month and the next eleven, every day. */
function monthsFrom(today: string): [string, string[]][] {
  const out: [string, string[]][] = [];
  let d = today.slice(0, 8) + "01";
  while (out.length < 12 || out.at(-1)![0] === d.slice(0, 7)) {
    const k = d.slice(0, 7);
    if (out.at(-1)?.[0] === k) out.at(-1)![1].push(d);
    else if (out.length < 12) out.push([k, [d]]);
    else break;
    d = add(d, 1);
  }
  return out;
}

/**
 * EXP-006: twelve months of sailing dates shaded by season, with the payment deadline you'd face if you booked today.
 * One keyboard stop: the arrow keys move by a day or a week, Home and End to the ends. The days are rendered on the
 * server; `CalendarKeys` adds the keyboard and hover behaviour with one set of listeners (PERF-003: hydrating 365
 * buttons cost 0.5 s of main-thread time on a phone). Without JavaScript every day still carries its words.
 */
export function SeasonCalendar({ today, periods }: { today: string; periods: PremiumPeriod[] }) {
  const months = monthsFrom(today);
  const active = add(today, 1);
  return (
    <section className={styles.calendar} aria-labelledby="season-calendar">
      <h2 id="season-calendar">Seasons and payment deadlines</h2>
      <p id="season-calendar-status" className={styles.status} role="status" aria-live="polite">
        {dayText(today, active, periods)}
      </p>
      <ul className={styles.legend}>
        <li>
          <span className={styles.summer} /> Summer: pay within 14 days of booking
        </li>
        <li>
          <span className={styles.winter} /> Main season: within 7 days
        </li>
        <li>
          <span className={styles.festive} /> Christmas, New Year and premium periods: within 3 days
        </li>
      </ul>
      <div id="season-calendar-days" className={styles.months}>
        {months.map(([month, ds]) => (
          <div key={month} className={styles.month}>
            <p className={styles.monthName}>{MONTH.format(new Date(`${month}-01T12:00:00Z`))}</p>
            <div className={styles.weekdays} aria-hidden="true">
              {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className={styles.days} style={{ ["--offset" as string]: (new Date(`${ds[0]}T12:00:00Z`).getUTCDay() + 6) % 7 }}>
              {ds.map((d) => {
                const k = d <= today ? "past" : deadlineRule(d, periods).rule;
                return (
                  <button
                    key={d}
                    type="button"
                    data-day={d}
                    tabIndex={d === active ? 0 : -1}
                    className={`${styles.day} ${styles[k === "premium" ? "festive" : k]}`}
                    aria-label={dayText(today, d, periods)}
                    aria-pressed={d === active}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <CalendarKeys grid="season-calendar-days" status="season-calendar-status" />
    </section>
  );
}

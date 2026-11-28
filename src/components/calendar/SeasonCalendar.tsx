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
const LONG_JA = new Intl.DateTimeFormat("ja", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH_JA = new Intl.DateTimeFormat("ja", { month: "long", year: "numeric", timeZone: "UTC" });
const long = (d: string, locale: string) => (locale === "ja" ? LONG_JA : LONG).format(new Date(`${d}T12:00:00Z`));

const WORDS = {
  en: {
    season: { festive: "Christmas and New Year", premium: "a premium period", winter: "the main season", summer: "summer" },
    passed: (day: string) => `${day} has passed.`,
    sail: (day: string, season: string, due: string) => `Sail on ${day}: ${season}. Book today and pay in full by ${due}.`,
    heading: "Seasons and payment deadlines",
    summer: "Summer: pay within 14 days of booking",
    winter: "Main season: within 7 days",
    festive: "Christmas, New Year and premium periods: within 3 days",
    weekdays: ["M", "T", "W", "T", "F", "S", "S"],
  },
  ja: {
    season: { festive: "クリスマス・年末年始", premium: "プレミアム期間", winter: "メインシーズン", summer: "夏季" },
    passed: (day: string) => `${day}は過ぎています。`,
    sail: (day: string, season: string, due: string) =>
      `${day}出航：${season}。本日予約する場合、全額のお支払い期限は${due}です。`,
    heading: "シーズンとお支払い期限",
    summer: "夏季：予約から14日以内にお支払い",
    winter: "メインシーズン：7日以内",
    festive: "クリスマス・年末年始とプレミアム期間：3日以内",
    weekdays: ["月", "火", "水", "木", "金", "土", "日"],
  },
};

/** The payment rules (RULE_WORDS in lib/payments/deadlines) as the public page says them in Japanese. */
export const RULE_LINES_JA = [
  "クリスマス・年末年始（12月24日〜1月7日）の出発は予約から3日以内にお支払いください。いずれの場合も出発前までとなります。",
  "プレミアム期間の出発は予約から3日以内にお支払いください。いずれの場合も出発前までとなります。",
  "10月〜4月の出発は予約から7日以内にお支払いください。いずれの場合も出発前までとなります。",
  "5月〜9月の出発は予約から14日以内にお支払いください。いずれの場合も出発前までとなります。",
];

/** Premium periods are named by admins in English; the ones we know are shown in Japanese. */
const periodName = (name: string, locale: string) => {
  const easter = locale === "ja" ? /^Western Easter (\d{4})$/.exec(name) : null;
  return easter ? `${easter[1]}年の復活祭（西方教会）` : name;
};

/** What the calendar says for a sailing date, booked today (EXP-006), from the same rules as booking (ADR-027). */
export function dayText(today: string, day: string, periods: PremiumPeriod[], locale: string = "en"): string {
  const words = WORDS[locale === "ja" ? "ja" : "en"];
  if (day <= today) return words.passed(long(day, locale));
  const r = deadlineRule(day, periods);
  const d = paymentDeadline(today, day, periods);
  const season = r.period ? periodName(r.period, locale) : words.season[r.rule];
  return words.sail(long(day, locale), season, long(d.dueOn, locale));
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
export function SeasonCalendar({ today, periods, locale = "en" }: { today: string; periods: PremiumPeriod[]; locale?: string }) {
  const words = WORDS[locale === "ja" ? "ja" : "en"];
  const months = monthsFrom(today);
  const active = add(today, 1);
  return (
    <section className={styles.calendar} aria-labelledby="season-calendar">
      <h2 id="season-calendar">{words.heading}</h2>
      <p id="season-calendar-status" className={styles.status} role="status" aria-live="polite">
        {dayText(today, active, periods, locale)}
      </p>
      <ul className={styles.legend}>
        <li>
          <span className={styles.summer} /> {words.summer}
        </li>
        <li>
          <span className={styles.winter} /> {words.winter}
        </li>
        <li>
          <span className={styles.festive} /> {words.festive}
        </li>
      </ul>
      <div id="season-calendar-days" className={styles.months}>
        {months.map(([month, ds]) => (
          <div key={month} className={styles.month}>
            <p className={styles.monthName}>{(locale === "ja" ? MONTH_JA : MONTH).format(new Date(`${month}-01T12:00:00Z`))}</p>
            <div className={styles.weekdays} aria-hidden="true">
              {words.weekdays.map((w, i) => (
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
                    aria-label={dayText(today, d, periods, locale)}
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

"use client";

import { useState } from "react";
import { formatMoney } from "@/components/ds/lib/format";
import {
  cairoInstant,
  flexibleTimes,
  openDays,
  placesLeft,
  PRIVATE_FROM,
  quoteTour,
  rateFromRow,
  type RateRow,
  type Season,
} from "@/lib/tours/calendar";
import styles from "./TourCalendar.module.css";

const MODE = { shared: "Shared group", private: "Private tour", transfer: "Private transfer", assist: "Meet and assist" };
const HINT = {
  shared: "Join a small group: at most 8 guests.",
  private: "Your own guide and vehicle.",
  transfer: "Priced per vehicle, one way.",
  assist: "Priced per party.",
};
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const usd = (m: number) => formatMoney({ amount: m, currency: "USD" }, "en");

/**
 * ADR-097: pick how, when and who; the price shows at once (quoteTour, the same sum the database makes when booking).
 * Posts rate, day, time and ages as hidden fields inside the page's booking form.
 */
export function TourCalendar({
  rates,
  seasons,
  taken,
  closed,
  now,
  adultsOnly,
}: {
  rates: RateRow[];
  seasons: Season[];
  taken: Record<string, number>;
  closed: string[];
  now: string;
  adultsOnly: boolean;
}) {
  const nowMs = Date.parse(now);
  const today = new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const nowHour = Number(
    new Date(nowMs).toLocaleString("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hourCycle: "h23" }),
  );
  const [rateId, setRateId] = useState(rates[0]!.id);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState("");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const row = rates.find((r) => r.id === rateId)!;
  const rate = rateFromRow(row);
  const childAges = kids
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((a) => Number.isInteger(a) && a >= 0 && a < 12);
  const ages = [...Array<number>(Math.max(adults, 0)).fill(30), ...childAges];
  const open = new Set(openDays({ today, days: row.days, leadHours: row.lead_hours, nowHour }));
  const times = (d: string) =>
    (row.start_times.length ? row.start_times : flexibleTimes(row.mode)).filter(
      (t) =>
        Date.parse(cairoInstant(d, t)) >= nowMs + row.lead_hours * 3_600_000 &&
        !closed.includes(`${row.id}|${cairoInstant(d, t)}`),
    );
  const dayTimes = day ? times(day) : [];
  const chosen = day && time && dayTimes.includes(time) ? cairoInstant(day, time) : null;
  const left = chosen && rate.mode === "shared" ? placesLeft(rate.maxGuests, taken[`${row.id}|${chosen}`] ?? 0) : null;
  // Only a start this rate offers on that day (switching shared to private can leave a time it doesn't have).
  const quote = day && time && chosen ? quoteTour(rate, ages, day, time, seasons) : null;
  const privateRate = rates.find((r) => r.mode === "private");
  const tooMany = left !== null && ages.length > left;

  // The month grid, Monday first.
  const first = new Date(`${month}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const shiftMonth = (n: number) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const lastMonth = new Date(Date.UTC(Number(today.slice(0, 4)) + 1, Number(today.slice(5, 7)) - 1, 1)).toISOString().slice(0, 7);
  const choose = (d: string) => {
    setDay(d);
    const ts = times(d);
    setTime(ts.length === 1 ? ts[0]! : null);
  };

  return (
    <div className={styles.calendar}>
      {rates.length > 1 ? (
        <fieldset className={styles.modes}>
          <legend>How</legend>
          {rates.map((r) => (
            <label key={r.id} className={styles.mode}>
              <input
                type="radio"
                name="rate_choice"
                value={r.id}
                checked={r.id === rateId}
                onChange={() => {
                  setRateId(r.id);
                  setTime(null);
                }}
              />
              <strong>
                {MODE[r.mode]}
                {r.label ? `: ${r.label}` : ""}
              </strong>{" "}
              <span className={styles.muted}>{HINT[r.mode]}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p>
          <strong>
            {MODE[row.mode]}
            {row.label ? `: ${row.label}` : ""}
          </strong>{" "}
          <span className={styles.muted}>{HINT[row.mode]}</span>
        </p>
      )}

      <fieldset className={styles.party}>
        <legend>Who</legend>
        <label>
          {adultsOnly ? "Guests (18 and over)" : "Adults and children 12 and over"}
          <input type="number" min={1} max={40} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
        </label>
        {adultsOnly ? null : (
          <label>
            Ages of children under 12 <span className={styles.muted}>(for example “9, 4”; under 3 free)</span>
            <input type="text" inputMode="numeric" value={kids} onChange={(e) => setKids(e.target.value)} />
          </label>
        )}
      </fieldset>

      <fieldset className={styles.when}>
        <legend>When (Cairo time)</legend>
        <div className={styles.monthBar}>
          <button type="button" onClick={() => shiftMonth(-1)} disabled={month <= today.slice(0, 7)} aria-label="Previous month">
            ‹
          </button>
          <span aria-live="polite">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
          <button type="button" onClick={() => shiftMonth(1)} disabled={month >= lastMonth} aria-label="Next month">
            ›
          </button>
        </div>
        <div className={styles.grid} role="group" aria-label="Dates">
          {WEEK.map((w) => (
            <span key={w} className={styles.dow} aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <button
                key={d}
                type="button"
                className={styles.day}
                disabled={!open.has(d) || !times(d).length}
                aria-pressed={d === day}
                aria-label={new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
                onClick={() => choose(d)}
              >
                {Number(d.slice(8))}
              </button>
            ) : (
              <span key={`blank-${i}`} />
            ),
          )}
        </div>
        {day ? (
          <label className={styles.time}>
            Start time
            <select value={time ?? ""} onChange={(e) => setTime(e.target.value || null)} required>
              <option value="">Choose</option>
              {dayTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className={styles.muted}>Choose a date. Dates you can’t pick are too soon or days the tour doesn’t run.</p>
        )}
      </fieldset>

      <div className={styles.price} aria-live="polite">
        {!quote ? (
          <p className={styles.muted}>Choose a date and time to see the price.</p>
        ) : !quote.ok ? (
          <p className={styles.problem}>
            {quote.problem}{" "}
            {rate.mode === "shared" && ages.length >= PRIVATE_FROM && privateRate ? (
              <button type="button" className={styles.link} onClick={() => setRateId(privateRate.id)}>
                Book it private
              </button>
            ) : null}
          </p>
        ) : tooMany ? (
          <p className={styles.problem}>
            {left ? `Only ${left} ${left === 1 ? "place" : "places"} left at this time.` : "This start is full."} Choose another
            time
            {privateRate ? " or book it private" : ""}.
          </p>
        ) : (
          <>
            <p className={styles.total}>
              {usd(quote.total)} <span className={styles.muted}>in all</span>
            </p>
            <p className={styles.muted}>
              {quote.lines.join(" · ")}
              {left !== null ? ` · ${left} ${left === 1 ? "place" : "places"} left` : ""}
            </p>
          </>
        )}
      </div>

      <input type="hidden" name="rate" value={rateId} />
      <input type="hidden" name="day" value={day ?? ""} />
      <input type="hidden" name="time" value={time ?? ""} />
      <input type="hidden" name="ages" value={ages.join(",")} />
    </div>
  );
}

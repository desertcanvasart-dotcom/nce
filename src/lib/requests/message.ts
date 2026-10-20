/**
 * ADR-099: what the operator's reservations contacts receive about a booking request, by email and WhatsApp. Guests
 * appear as a count and the lead's nationality, never names. Every message carries the four actions as signed links.
 */
export type RequestSummary = {
  reference: string;
  operator: string;
  vessel: string;
  origin: string;
  destination: string;
  departsOn: string;
  nights: number;
  /** Cabins asked for, by cabin type. */
  lines: { cabin: string; count: number }[];
  guests: number;
  nationality: string | null;
  /** What our data showed for each cabin type when the request was made. */
  shown: { cabin: string; available: number | null; source: string | null; confirmedAt: string | null }[];
  createdAt: string;
};
export type Links = { confirm: string; decline: string; hold: string; other: string };
export type Email = { subject: string; text: string; html: string };

const SOURCE = {
  manual: "manual entry",
  paste: "pasted data",
  feed: "feed",
  api: "API",
  tap: "last answer",
  sheet: "vacancy sheet",
} as Record<string, string>;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Cairo" });
const date = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "Your feed from 3 Feb showed 4 Standard free" for each cabin type asked for. */
export function shownLines(s: RequestSummary): string[] {
  return s.shown.map((x) =>
    x.available === null || !x.confirmedAt
      ? `We had no availability for ${x.cabin}.`
      : `Your ${SOURCE[x.source ?? ""] ?? "data"} from ${day(x.confirmedAt)} showed ${x.available} ${x.cabin} free.`,
  );
}

export function facts(s: RequestSummary): string[] {
  return [
    `Ship: ${s.vessel}`,
    `Cruise: ${s.origin} to ${s.destination}, embarking ${date(s.departsOn)}, ${s.nights} nights`,
    `Cabins: ${s.lines.map((l) => `${l.count} × ${l.cabin}`).join(", ")}`,
    `Guests: ${s.guests}${s.nationality ? ` (lead guest's nationality: ${s.nationality})` : ""}`,
    `Request: ${s.reference}`,
  ];
}

const ACTION_TEXT = [
  ["confirm", "Confirm"],
  ["decline", "Decline"],
  ["hold", "Hold 72h"],
  ["other", "Offer other"],
] as const;

function render(intro: string[], s: RequestSummary, links: Links, outro: string[]): { text: string; html: string } {
  const body = [...intro, "", ...facts(s), "", ...shownLines(s)];
  const text = [
    ...body,
    "",
    "Answer with one tap (no login needed):",
    ...ACTION_TEXT.map(([k, label]) => `${label}: ${links[k]}`),
    "",
    ...outro,
  ].join("\n");
  const buttons = ACTION_TEXT.map(
    ([k, label]) =>
      `<a href="${esc(links[k])}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border:1px solid #0b1b3a;border-radius:4px;color:#0b1b3a;text-decoration:none;font-weight:600">${label}</a>`,
  ).join("");
  const html = [
    `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0b1b3a">`,
    ...body.map((l) => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : `<div style="height:8px"></div>`)),
    `<p style="margin:16px 0 8px"><strong>Answer with one tap</strong> (no login needed):</p>`,
    `<p>${buttons}</p>`,
    ...outro.map((l) => `<p style="margin:0 0 6px;color:#555">${esc(l)}</p>`),
    `</div>`,
  ].join("\n");
  return { text, html };
}

const FOOT = [
  "The links work for 7 days. Each answer updates your availability on Nilecruz.",
  "Nilecruz, booking agent for your cruises.",
];

export function requestEmail(s: RequestSummary, links: Links, slaHours: number): Email {
  return {
    subject: `Booking request ${s.reference}: ${s.vessel}, ${date(s.departsOn)}`,
    ...render([`A customer asks to book on ${s.vessel}. Please answer within ${slaHours} hours.`], s, links, FOOT),
  };
}

export function reminderEmail(s: RequestSummary, links: Links, slaHours: number): Email {
  return {
    subject: `Reminder: booking request ${s.reference} is waiting for your answer`,
    ...render([`This request has waited more than ${slaHours} hours. The customer is waiting for your answer.`], s, links, FOOT),
  };
}

/** To Nilecruz admins at twice the reply time: phone the operator. */
export function escalationEmail(s: RequestSummary, slaHours: number, adminLink: string): Email {
  const lines = [
    `${s.operator} hasn't answered booking request ${s.reference} after ${2 * slaHours} hours (reply time ${slaHours} hours).`,
    "Please phone them.",
    "",
    ...facts(s),
    "",
    `Open it in the dashboard: ${adminLink}`,
  ];
  return {
    subject: `Phone ${s.operator}: request ${s.reference} unanswered`,
    text: lines.join("\n"),
    html: lines.map((l) => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : "<br>")).join("\n"),
  };
}

/** 09:00 Cairo: what's open and which holds end today. Nothing when both are empty. */
export function digestEmail(
  operator: string,
  open: { reference: string; vessel: string; departsOn: string; link: string }[],
  holdsEnding: { reference: string; vessel: string; holdUntil: string; link: string }[],
): Email | null {
  if (!open.length && !holdsEnding.length) return null;
  const lines = [
    `Good morning, ${operator}.`,
    "",
    ...(open.length
      ? [
          `Waiting for your answer (${open.length}):`,
          ...open.map((o) => `- ${o.reference} · ${o.vessel} · ${date(o.departsOn)}: ${o.link}`),
          "",
        ]
      : []),
    ...(holdsEnding.length
      ? [
          `Holds ending today (${holdsEnding.length}): confirm or let them go.`,
          ...holdsEnding.map(
            (h) =>
              `- ${h.reference} · ${h.vessel} · until ${day(h.holdUntil)} ${new Date(h.holdUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" })} Cairo: ${h.link}`,
          ),
        ]
      : []),
  ];
  return {
    subject: `Nilecruz today: ${open.length} waiting, ${holdsEnding.length} holds ending`,
    text: lines.join("\n"),
    html: lines.map((l) => (l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : "<br>")).join("\n"),
  };
}

/**
 * WhatsApp: the approved template "nilecruz_booking_request" (docs/whatsapp-templates.md) takes five body values and
 * four URL buttons whose suffix is the signed token.
 */
export function whatsappParams(s: RequestSummary): string[] {
  return [
    s.vessel,
    `${s.origin} to ${s.destination}, ${date(s.departsOn)}, ${s.nights} nights`,
    s.lines.map((l) => `${l.count} × ${l.cabin}`).join(", "),
    `${s.guests}${s.nationality ? ` (${s.nationality})` : ""}`,
    shownLines(s).join(" "),
  ];
}

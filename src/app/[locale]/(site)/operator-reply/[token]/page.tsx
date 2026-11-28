import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, TextArea } from "@/components/dashboard/ui";
import type { Locale } from "@/i18n/routing";
import { facts, shownLines, type RequestSummary } from "@/lib/requests/message";
import { replyState } from "@/server/requests/reply";
import { answerLink } from "./actions";
import styles from "./reply.module.css";

/**
 * ADR-099: where a booking request's one-tap link lands. Confirm, decline and hold apply only when the button here is
 * pressed, so mail scanners that open links change nothing. A used or expired link shows the recorded answer.
 */
export const dynamic = "force-dynamic";
type Params = Promise<{ locale: Locale; token: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "operatorReply" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const ANSWERS = ["confirm", "decline", "hold", "other"];
const STATUSES = ["confirmed", "declined", "held", "alternative_offered", "expired", "withdrawn"];

type Say = Awaited<ReturnType<typeof getTranslations<"operatorReply">>>;

/**
 * The facts and "what our data showed" lines in Japanese. Every other language shows the lines the email itself carries
 * (lib/requests/message).
 */
function japaneseLines(s: RequestSummary, t: Say, places: Record<string, string>): string[] {
  const day = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString("ja-JP", { ...o, timeZone: "Africa/Cairo" });
  const source = (v: string | null) =>
    t(`facts.source.${["manual", "paste", "feed", "api", "tap", "sheet"].includes(v ?? "") ? v : "data"}` as never);
  return [
    t("facts.ship", { vessel: s.vessel }),
    t("facts.cruise", {
      origin: places[s.origin] ?? s.origin,
      destination: places[s.destination] ?? s.destination,
      date: day(`${s.departsOn}T12:00:00Z`, { year: "numeric", month: "short", day: "numeric", weekday: "short" }),
      nights: String(s.nights),
    }),
    t("facts.cabins", { list: s.lines.map((l) => `${l.cabin} × ${l.count}`).join("、") }),
    t("facts.guests", {
      n: String(s.guests),
      nationality: s.nationality ? t("facts.nationality", { code: s.nationality }) : "",
    }),
    ...(s.agency ? [t("facts.agency", { agency: s.agency })] : []),
    t("facts.request", { reference: s.reference }),
    ...s.shown.map((x) =>
      x.available === null || !x.confirmedAt
        ? t("facts.noData", { cabin: x.cabin })
        : t("facts.shown", {
            source: source(x.source),
            date: day(x.confirmedAt, { month: "short", day: "numeric" }),
            n: String(x.available),
            cabin: x.cabin,
          }),
    ),
  ];
}

export default async function OperatorReply({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ via?: string }>;
}) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "operatorReply" });
  const dateTag = locale === "ja" ? "ja-JP" : "en-GB";
  const places = (await getTranslations({ locale, namespace: "vesselPage" })).raw("places") as Record<string, string>;
  const language = <input type="hidden" name="locale" value={locale} />;
  const via = (await searchParams).via === "whatsapp" ? "whatsapp" : "email";
  const state = await replyState(decodeURIComponent(token));

  if (state.kind === "invalid")
    return (
      <main id="main" className={styles.page}>
        <h1>{t("invalidTitle")}</h1>
        <p>{t("invalidText")}</p>
      </main>
    );

  const summary = state.summary;
  const details = summary ? (
    <ul className={styles.facts}>
      {(locale === "ja" ? japaneseLines(summary, t, places) : [...facts(summary), ...shownLines(summary)]).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  ) : null;

  if (state.kind === "expired")
    return (
      <main id="main" className={styles.page}>
        <h1>{t("expiredTitle")}</h1>
        <p>{t("expiredText")}</p>
        {details}
      </main>
    );

  if (state.kind === "answered")
    return (
      <main id="main" className={styles.page}>
        <h1>
          {t("answeredTitle", {
            reference: summary!.reference,
            status: STATUSES.includes(state.summary.status) ? t(`status.${state.summary.status}` as never) : state.summary.status,
          })}
        </h1>
        {state.response ? (
          <p>
            {t("recorded")}{" "}
            <strong>{ANSWERS.includes(state.response) ? t(`answer.${state.response}` as never) : state.response}</strong>
            {state.respondedAt
              ? t("firstAnswer", {
                  when: new Date(state.respondedAt).toLocaleString(dateTag, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Cairo",
                  }),
                })
              : ""}
            {t("end")}
          </p>
        ) : null}
        {details}
      </main>
    );

  const action = answerLink.bind(null, decodeURIComponent(token), via);
  return (
    <main id="main" className={styles.page}>
      <p className={styles.kicker}>{t("kicker")}</p>
      <h1>{t("heading", { vessel: summary!.vessel, reference: summary!.reference })}</h1>
      {details}
      {state.action === "other" ? (
        <ActionForm action={action} submit={t("sendOffer")}>
          {language}
          <p>{t("offerText")}</p>
          <Select
            label={t("anotherDate")}
            name="departure_id"
            placeholder={t("sameDate")}
            options={state.sailings.map((s) => ({
              value: s.id,
              label: new Date(`${s.departsOn}T12:00:00Z`).toLocaleDateString(dateTag, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              }),
            }))}
          />
          <Select
            label={t("anotherCabin")}
            name="cabin_type_id"
            placeholder={t("sameCabin")}
            options={state.cabinTypes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label={t("cabins")}
            name="cabins"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={summary!.lines.reduce((n, l) => n + l.count, 0)}
            inputMode="numeric"
          />
          <TextArea label={t("note")} name="note" rows={3} maxLength={500} />
        </ActionForm>
      ) : (
        <ActionForm action={action} submit={t(`button.${state.action}.title`)}>
          {language}
          <p>{t(`button.${state.action}.text`)}</p>
        </ActionForm>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, TextArea } from "@/components/dashboard/ui";
import { facts, shownLines } from "@/lib/requests/message";
import { replyState } from "@/server/requests/reply";
import { answerLink } from "./actions";
import styles from "./reply.module.css";

/**
 * ADR-099: where a booking request's one-tap link lands. Confirm, decline and hold apply only when the button here is
 * pressed, so mail scanners that open links change nothing. A used or expired link shows the recorded answer.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking request", robots: { index: false, follow: false } };

const ANSWER = {
  confirm: "Confirmed",
  decline: "Declined",
  hold: "Held for 72 hours",
  other: "Something else offered",
} as Record<string, string>;
const STATUS = {
  confirmed: "confirmed",
  declined: "declined",
  held: "held for 72 hours",
  alternative_offered: "answered with another offer",
  expired: "expired without an answer",
  withdrawn: "withdrawn by the customer",
} as Record<string, string>;
const BUTTON = {
  confirm: { title: "Confirm these cabins", text: "The customer is asked to pay straight away." },
  decline: { title: "Decline", text: "We mark these cabins as full and offer the customer other dates." },
  hold: { title: "Hold for 72 hours", text: "The cabins are held while you check. Confirm or decline before the hold ends." },
} as const;

export default async function OperatorReply({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { token } = await params;
  const via = (await searchParams).via === "whatsapp" ? "whatsapp" : "email";
  const state = await replyState(decodeURIComponent(token));

  if (state.kind === "invalid")
    return (
      <main id="main" className={styles.page}>
        <h1>This link isn’t valid</h1>
        <p>Please use the link in the latest message from Nilecruz, or contact us.</p>
      </main>
    );

  const summary = state.summary;
  const details = summary ? (
    <ul className={styles.facts}>
      {[...facts(summary), ...shownLines(summary)].map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  ) : null;

  if (state.kind === "expired")
    return (
      <main id="main" className={styles.page}>
        <h1>This link has expired</h1>
        <p>Links work for 7 days. Please contact Nilecruz about this request.</p>
        {details}
      </main>
    );

  if (state.kind === "answered")
    return (
      <main id="main" className={styles.page}>
        <h1>
          Request {summary!.reference} is {STATUS[state.summary.status] ?? state.summary.status}
        </h1>
        {state.response ? (
          <p>
            Recorded answer: <strong>{ANSWER[state.response] ?? state.response}</strong>
            {state.respondedAt
              ? ` (first answer ${new Date(state.respondedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" })} Cairo)`
              : ""}
            .
          </p>
        ) : null}
        {details}
      </main>
    );

  const action = answerLink.bind(null, decodeURIComponent(token), via);
  return (
    <main id="main" className={styles.page}>
      <p className={styles.kicker}>Nilecruz booking request</p>
      <h1>
        {summary!.vessel}: request {summary!.reference}
      </h1>
      {details}
      {state.action === "other" ? (
        <ActionForm action={action} submit="Send this offer">
          <p>Offer another date or cabin type. The customer chooses; nothing changes until they book.</p>
          <Select
            label="Another date"
            name="departure_id"
            placeholder="Same date"
            options={state.sailings.map((s) => ({
              value: s.id,
              label: new Date(`${s.departsOn}T12:00:00Z`).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              }),
            }))}
          />
          <Select
            label="Another cabin type"
            name="cabin_type_id"
            placeholder="Same cabin type"
            options={state.cabinTypes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="Number of cabins"
            name="cabins"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={summary!.lines.reduce((n, l) => n + l.count, 0)}
            inputMode="numeric"
          />
          <TextArea label="Short note for the customer" name="note" rows={3} maxLength={500} />
        </ActionForm>
      ) : (
        <ActionForm action={action} submit={BUTTON[state.action].title}>
          <p>{BUTTON[state.action].text}</p>
        </ActionForm>
      )}
    </main>
  );
}

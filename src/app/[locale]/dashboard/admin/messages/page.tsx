import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { nowMs } from "@/lib/product/departures";
import { fileMessage } from "./actions";

const TOPIC = {
  cruise: "Choosing a cruise",
  booking: "A booking",
  vessel: "A vessel or our evaluation",
  partner: "Operators and travel partners",
  other: "Something else",
} as const;

/**
 * PAGE-106 (ADR-097): messages sent from the Contact page; admins are emailed about each (ADR-101). Also email
 * delivery (DASH-BND-007): what went out in the last day, and what didn't.
 */
export default async function MessagesPage() {
  await requireAdmin(undefined, "/dashboard/admin/messages/");
  const db = await getDb();
  const { data } = await db
    .from("contact_messages")
    .select("id, name, email, topic, message, created_at, handled_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const since = new Date(nowMs() - 86_400_000).toISOString();
  const { data: out } = await db
    .from("outbound_messages")
    .select("id, channel, kind, to_address, subject, status, error, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  const count = (st: string) => (out ?? []).filter((m) => m.status === st).length;
  const problems = (out ?? []).filter((m) => m.status !== "sent").slice(0, 20);
  const open = (data ?? []).filter((m) => !m.handled_at);
  const done = (data ?? []).filter((m) => m.handled_at);
  const list = (rows: typeof open, handled: boolean) =>
    rows.length ? (
      <ul className={ui.list}>
        {rows.map((m) => (
          <li key={m.id}>
            <p>
              <strong>{m.name}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a> · {TOPIC[m.topic]} ·{" "}
              <CairoTime value={m.created_at} />
            </p>
            <p className={ui.prewrap}>{m.message}</p>
            <ActionForm
              action={fileMessage.bind(null, m.id, !handled)}
              submit={handled ? "Reopen" : "Mark as handled"}
              variant="ghost"
            />
          </li>
        ))}
      </ul>
    ) : (
      <p className={ui.muted}>{handled ? "Nothing handled yet." : "No open messages."}</p>
    );
  return (
    <>
      <h1 className={ui.pageTitle}>Messages</h1>
      <p className={ui.muted}>
        Sent from the Contact page. Reply by email from your own mailbox, then mark the message as handled.
      </p>
      <Section title={`Open (${open.length})`} id="open">
        {list(open, false)}
      </Section>
      <Section title="Handled" id="handled">
        {list(done, true)}
      </Section>
      <Section title="Email delivery" id="email">
        <p>
          Last 24 hours: {count("sent")} sent, {count("failed")} failed (tried again up to 3 times), {count("skipped")} not sent.
        </p>
        {problems.length ? (
          <ul className={ui.list}>
            {problems.map((m) => (
              <li key={m.id}>
                <CairoTime value={m.created_at} /> · {m.channel} to {m.to_address} · {m.subject ?? m.kind} ·{" "}
                <strong>{m.status}</strong>
                {m.error ? `: ${m.error}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>Everything in the last day was sent.</p>
        )}
      </Section>
    </>
  );
}

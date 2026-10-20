import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { fileMessage } from "./actions";

const TOPIC = {
  cruise: "Choosing a cruise",
  booking: "A booking",
  vessel: "A vessel or our evaluation",
  partner: "Operators and travel partners",
  other: "Something else",
} as const;

/** PAGE-106 (ADR-097): messages sent from the Contact page. Reply by email; email notifications come in Batch 8. */
export default async function MessagesPage() {
  await requireAdmin(undefined, "/dashboard/admin/messages/");
  const db = await getDb();
  const { data } = await db
    .from("contact_messages")
    .select("id, name, email, topic, message, created_at, handled_at")
    .order("created_at", { ascending: false })
    .limit(200);
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
    </>
  );
}

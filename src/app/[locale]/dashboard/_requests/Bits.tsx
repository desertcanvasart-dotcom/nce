import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, ui } from "@/components/dashboard/ui";
import { facts, shownLines, type RequestSummary } from "@/lib/requests/message";
import { CairoTime } from "@/components/shell/CairoTime";
import { getDb } from "@/server/db";
import { addContact, removeContact } from "./actions";

/** ADR-099: shared pieces of the booking-request screens. */
export function RequestFacts({ summary }: { summary: RequestSummary }) {
  return (
    <ul className={ui.list}>
      {[...facts(summary), ...shownLines(summary)].map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

type Stats = {
  answered: number;
  median_minutes: number | null;
  within_sla_pct: number | null;
  shown_free: number;
  shown_free_declined: number;
  decline_rate_pct: number | null;
  confirm_within_hours: number;
} | null;

const hm = (m: number | null) => (m === null ? "—" : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);

/** Reply metrics over the last 90 days: on the admin operator page and the operator's connection health. */
export function ReplyStats({ stats, slaHours }: { stats: Stats; slaHours: number }) {
  return (
    <Section title="Booking requests: answers" id="replies">
      <p className={ui.muted}>
        Last 90 days. Answer within {slaHours} hours: a reminder goes out then, and Nilecruz phones at twice that.
      </p>
      <dl className={ui.grid}>
        <div>
          <dt>Answered</dt>
          <dd>{stats?.answered ?? 0}</dd>
        </div>
        <div>
          <dt>Median reply</dt>
          <dd>{hm(stats?.median_minutes ?? null)}</dd>
        </div>
        <div>
          <dt>Answered within {slaHours} h</dt>
          <dd>{stats?.within_sla_pct === null || stats?.within_sla_pct === undefined ? "—" : `${stats.within_sla_pct} %`}</dd>
        </div>
        <div>
          <dt>Declined when our data showed space</dt>
          <dd>
            {stats?.decline_rate_pct === null || stats?.decline_rate_pct === undefined
              ? "—"
              : `${stats.decline_rate_pct} % (${stats.shown_free_declined} of ${stats.shown_free})`}
          </dd>
        </div>
        <div>
          <dt>Customers are told</dt>
          <dd>confirmed within {stats?.confirm_within_hours ?? 24} hours</dd>
        </div>
      </dl>
    </Section>
  );
}

type Contact = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  reservations: boolean;
  sheets: boolean;
  whatsapp_opt_in_at: string | null;
};

/** Who gets booking requests (and, later, sends sheets). No login needed. */
export function Contacts({
  orgId,
  contacts,
  canEdit,
  admin,
}: {
  orgId: string;
  contacts: Contact[];
  canEdit: boolean;
  admin: boolean;
}) {
  return (
    <Section title="Request contacts" id="contacts">
      <p className={ui.muted}>
        Booking requests go to these people by email (and WhatsApp, once switched on) with one-tap answers; no login needed.
        Without any, they go to your owners and reservations staff.
      </p>
      {contacts.length ? (
        <ul className={ui.list}>
          {contacts.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong> ·{" "}
              {[c.email, c.whatsapp ? `WhatsApp ${c.whatsapp}${c.whatsapp_opt_in_at ? "" : " (not opted in)"}` : null]
                .filter(Boolean)
                .join(" · ")}{" "}
              · {[c.reservations ? "requests" : null, c.sheets ? "sheets" : null].filter(Boolean).join(", ") || "no messages"}
              {canEdit ? (
                <ActionForm action={removeContact.bind(null, orgId, admin, c.id)} submit={`Remove ${c.name}`} variant="ghost">
                  {null}
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No contacts yet.</p>
      )}
      {canEdit ? (
        <ActionForm action={addContact.bind(null, orgId, admin)} submit="Add contact" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Input label="Name" name="name" required maxLength={120} />
            <Input label="Email" name="email" type="email" maxLength={254} />
            <Input label="WhatsApp number" name="whatsapp" hint="International format, like +201001234567" maxLength={16} />
          </div>
          <Checkboxes
            legend="Sends and receives"
            name="roles"
            options={[
              { value: "reservations", label: "Booking requests" },
              { value: "sheets", label: "Vacancy sheets" },
            ]}
            checked={["reservations"]}
          />
          <Checkboxes
            legend="WhatsApp"
            name="opt_in"
            options={[{ value: "yes", label: "This person agreed to get messages on WhatsApp" }]}
            checked={[]}
          />
        </ActionForm>
      ) : null}
    </Section>
  );
}

/** Part B: the last vacancy sheet Nilecruz received from this operator, on its connection health. */
export async function LastSheet({ orgId }: { orgId: string }) {
  const db = await getDb();
  const { data } = await db
    .from("sheet_ingests")
    .select("received_at, sheet_date, status, channel")
    .eq("org_id", orgId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <Section title="Vacancy sheets" id="sheets">
      {data ? (
        <p>
          Last sheet received <CairoTime value={data.received_at} /> by {data.channel}
          {data.sheet_date ? `, dated ${data.sheet_date}` : ""}:{" "}
          {data.status === "confirmed" ? "confirmed" : data.status === "rejected" ? "not used" : "being checked by Nilecruz"}.
        </p>
      ) : (
        <p className={ui.muted}>No sheet received yet. See the format page for where to send it.</p>
      )}
    </Section>
  );
}

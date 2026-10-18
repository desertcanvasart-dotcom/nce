import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { slugify } from "@/lib/data/slugs";
import { EVENT_LABEL, PROPOSAL_FIELDS, type Proposal } from "@/lib/catalogue/proposal";
import { adminCan, STATUS_LABEL } from "@/lib/catalogue/submission-states";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { approve, reject, requestChanges } from "../actions";

/** DASH-ADM-037–040: compare the proposal with the current record, read the history, decide. */
export default async function SubmissionReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  await requireAdmin(["catalogue"], `/dashboard/admin/submissions/${id}/`);
  const db = await getDb();
  const { data: s } = await db
    .from("vessel_submissions")
    .select(
      "id, status, proposal, vessel_id, org:organisations(id, display_name), vessel:vessels(name, type, route_text, cabin_count, max_guests, deck_count, year_built, vessel_translations(locale, description)), vessel_submission_events(id, event, message, occurred_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s || s.status === "draft") notFound();
  const p = s.proposal as Proposal;
  const current: Record<string, string> = s.vessel
    ? {
        name: s.vessel.name,
        type: s.vessel.type,
        route_text: s.vessel.route_text ?? "",
        cabin_count: String(s.vessel.cabin_count ?? ""),
        max_guests: String(s.vessel.max_guests ?? ""),
        deck_count: String(s.vessel.deck_count ?? ""),
        year_built: String(s.vessel.year_built ?? ""),
        description_en: s.vessel.vessel_translations.find((t) => t.locale === "en")?.description ?? "",
      }
    : {};
  const can = adminCan(s.status);
  const events = [...s.vessel_submission_events].sort((a, b) => a.id - b.id);

  return (
    <>
      <p>
        <Link href="/dashboard/admin/submissions/">← Submissions</Link>
      </p>
      <h1 className={ui.pageTitle}>{s.vessel?.name ?? `New vessel: ${p.name ?? "unnamed"}`}</h1>
      <p className={ui.actions}>
        <Badge tone={s.status === "submitted" ? "accent" : "neutral"}>{STATUS_LABEL[s.status]}</Badge>
        <span className={ui.muted}>from {s.org?.display_name}</span>
      </p>

      <Section title="Proposal" id="proposal">
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Proposed values{s.vessel ? " next to the current ones" : ""}</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                {s.vessel ? <th scope="col">Now</th> : null}
                <th scope="col">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {PROPOSAL_FIELDS.map((f) => {
                const changed = s.vessel && (p[f.key] ?? "") !== "" && (p[f.key] ?? "") !== (current[f.key] ?? "");
                return (
                  <tr key={f.key}>
                    <th scope="row">{f.label}</th>
                    {s.vessel ? <td>{current[f.key] || "—"}</td> : null}
                    <td>
                      {p[f.key] || "—"}
                      {changed ? (
                        <>
                          {" "}
                          <Badge tone="accent">Changed</Badge>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="History" id="history">
        <ol className={ui.list}>
          {events.map((e) => (
            <li key={e.id}>
              <CairoTime value={e.occurred_at} /> · {EVENT_LABEL[e.event]}
              {e.message ? `: “${e.message}”` : ""}
            </li>
          ))}
        </ol>
      </Section>

      {can.approve ? (
        <Section title="Decision" id="decision">
          <ActionForm action={approve.bind(null, id)} submit="Approve">
            {s.vessel ? (
              <p className={ui.muted}>The proposed values replace the current ones. The vessel’s visibility doesn’t change.</p>
            ) : (
              <Input
                label="Address name for the new vessel"
                name="slug"
                defaultValue={slugify(p.name ?? "")}
                hint="It becomes a private draft of this operator."
              />
            )}
          </ActionForm>
          <ActionForm action={requestChanges.bind(null, id)} submit="Request changes" variant="outline">
            <TextArea label="What should the operator change?" name="note" required maxLength={4000} rows={3} />
          </ActionForm>
          <ActionForm action={reject.bind(null, id)} submit="Reject" variant="ghost">
            <TextArea label="Why is it rejected?" name="note" required maxLength={4000} rows={3} />
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}

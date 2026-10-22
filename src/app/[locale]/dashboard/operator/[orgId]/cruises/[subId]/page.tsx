import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { MOORING, SHARED_SPACES } from "@/lib/catalogue/mooring";
import { CairoTime } from "@/components/shell/CairoTime";
import { VESSEL_TYPE_LABEL } from "@/lib/catalogue/categories";
import { EVENT_LABEL, type Proposal } from "@/lib/catalogue/proposal";
import { operatorCan, STATUS_LABEL } from "@/lib/catalogue/submission-states";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../../sections";
import { deleteDraft, saveProposal, submitForReview } from "../actions";

/** DASH-OPR-006, 007: edit a draft, submit it, read the feedback, resubmit. */
export default async function SubmissionPage({ params }: { params: Promise<{ orgId: string; subId: string }> }) {
  const { orgId, subId } = await params;
  if (!isUuid(orgId) || !isUuid(subId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/cruises/${subId}/`,
  });
  const db = await getDb();
  const { data: s } = await db
    .from("vessel_submissions")
    .select("id, status, proposal, vessel_id, vessel:vessels(name), vessel_submission_events(id, event, message, occurred_at)")
    .eq("id", subId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!s) notFound();
  const p = s.proposal as Proposal;
  const can = operatorCan(s.status);
  const events = [...s.vessel_submission_events].sort((a, b) => a.id - b.id);
  const feedback = [...events].reverse().find((e) => e.event === "changes_requested" || e.event === "rejected");

  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/cruises/`}>← Cruises and submissions</Link>
      </p>
      <h1 className={ui.pageTitle}>{s.vessel?.name ?? (p.name || "New vessel")}</h1>
      <p className={ui.actions}>
        <Badge tone={s.status === "changes_requested" ? "accent" : "neutral"}>{STATUS_LABEL[s.status]}</Badge>
      </p>
      {feedback && (s.status === "changes_requested" || s.status === "rejected") ? (
        <Notice tone={s.status === "rejected" ? "error" : "info"}>Nilecruz: “{feedback.message}”</Notice>
      ) : null}
      {s.status === "submitted" ? <Notice>Under review. It is locked until Nilecruz decides.</Notice> : null}
      {s.status === "approved" ? (
        <Notice tone="success">Approved. The information is now in the Nilecruz catalogue.</Notice>
      ) : null}

      {can.edit ? (
        <Section title="Proposal" id="proposal">
          <ActionForm action={saveProposal.bind(null, orgId, subId)} submit="Save draft">
            <div className={ui.grid}>
              <Input label="Name" name="name" required maxLength={120} defaultValue={p.name} />
              <Select
                label="Type"
                name="type"
                required
                placeholder="Choose a type"
                defaultValue={p.type}
                options={Object.entries(VESSEL_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <Input label="Route" name="route_text" maxLength={200} defaultValue={p.route_text} />
              <Input label="Cabins" name="cabin_count" inputMode="numeric" defaultValue={p.cabin_count} />
              <Input label="Guests" name="max_guests" inputMode="numeric" defaultValue={p.max_guests} />
              <Input label="Decks" name="deck_count" inputMode="numeric" defaultValue={p.deck_count} />
              <Input label="Year built" name="year_built" inputMode="numeric" defaultValue={p.year_built} />
              <Select
                label="Mooring"
                name="mooring"
                placeholder="Not given"
                defaultValue={p.mooring}
                options={MOORING}
                hint="Where the vessel usually moors at night. Travellers see this on its page."
              />
            </div>
            <Checkboxes
              legend="Shared spaces"
              name="shared_spaces"
              options={SHARED_SPACES}
              checked={p.shared_spaces ? p.shared_spaces.split(",") : []}
              hint="The spaces all guests share. The vessel page says how many guests share them."
            />
            <TextArea
              label="Description (English)"
              name="description_en"
              lang="en"
              maxLength={4000}
              defaultValue={p.description_en}
            />
          </ActionForm>
          <div className={ui.actions}>
            <ActionForm
              action={submitForReview.bind(null, orgId, subId)}
              submit={s.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
            />
            {can.delete ? (
              <ActionForm action={deleteDraft.bind(null, orgId, subId)} submit="Delete draft" variant="ghost" />
            ) : null}
          </div>
        </Section>
      ) : (
        <Section title="Proposal" id="proposal">
          <dl className={ui.grid}>
            {Object.entries(p).map(([k, v]) => (
              <div key={k}>
                <dt className={ui.label}>{k.replace(/_/g, " ")}</dt>
                <dd>{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

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
    </>
  );
}

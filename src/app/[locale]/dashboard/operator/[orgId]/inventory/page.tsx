import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Notice, Section, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireOrgRole } from "@/server/auth";
import { hoursText } from "@/lib/product/pricing";
import { connectionsFor, pastePreview } from "@/server/connections/queries";
import { freshnessHours } from "@/server/product/queries";
import { FEED_STATUS, HealthTable, RunsTable } from "../../../_connections/Tables";
import { RowTable } from "../../../_connections/RowTable";
import { operatorContacts, replySla, replyStats } from "@/server/requests/queries";
import { Contacts, LastSheet, ReplyStats } from "../../../_requests/Bits";
import { Allotments } from "../../../_allotments/Allotments";
import { isUuid } from "../../../sections";
import { applyPaste, createKey, discardPaste, previewPaste, removeFeed, revokeKey, saveFeed } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string }>; searchParams: Promise<{ run?: string }> };

/** DASH-OPR-016, 024–027: how this company keeps availability and prices current, and how well it is working. */
export default async function InventoryConnections({ params, searchParams }: Props) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: `/dashboard/operator/${orgId}/inventory/` });
  const sp = await searchParams;
  const [c, run, hours, contacts, stats, sla] = await Promise.all([
    connectionsFor(orgId),
    sp.run && isUuid(sp.run) ? pastePreview(orgId, sp.run) : null,
    freshnessHours(),
    operatorContacts(orgId),
    replyStats(orgId),
    replySla(orgId),
  ]);
  const activeKeys = c.keys.filter((k) => !k.revoked_at);
  const formatHref = `/dashboard/operator/${orgId}/inventory/format/`;

  return (
    <>
      <h1 className={ui.pageTitle}>Inventory connections</h1>
      <p>
        Manual entry is always available in{" "}
        <Link href={`/dashboard/operator/${orgId}/schedules/`}>Routes, schedules and rates</Link>. To keep availability and prices
        current from your own system, paste them, let Nilecruz pull a feed every hour, or send them to our API. All three use the{" "}
        <Link href={formatHref}>Nilecruz inventory format v1</Link> and the same checks.
      </p>

      <Section title="Health" id="health">
        <HealthTable health={c.health} />
        <p className={ui.muted}>
          Availability from a feed or the API counts as confirmed for {hoursText(hours.feed)}, pasted or manual availability for{" "}
          {hoursText(hours.manual)}. Older availability is shown to travellers as “to be confirmed” and can’t be reserved.
        </p>
      </Section>

      <Allotments orgId={orgId} canEdit={false} />
      <LastSheet orgId={orgId} />
      <ReplyStats stats={stats} slaHours={sla} />
      <Contacts orgId={orgId} contacts={contacts} canEdit admin={false} />

      <Section title="Paste JSON or XML" id="paste">
        {run && run.status === "previewed" ? (
          <>
            <p>
              <strong>{run.label}</strong>: {run.rows_received} rows checked · {run.rows_changed} will change ·{" "}
              {run.rows_unchanged} only re-confirmed · {run.rows_skipped} not applied (Nilecruz has newer data) ·{" "}
              {run.rows_failed} with problems. Nothing has been changed yet.
            </p>
            <RowTable rows={run.results} caption="Preview of the pasted rows" />
            <div className={ui.actions}>
              {run.rows_changed + run.rows_unchanged > 0 ? (
                <ActionForm
                  action={applyPaste.bind(null, orgId, run.id)}
                  submit={`Apply ${run.rows_changed + run.rows_unchanged} row${run.rows_changed + run.rows_unchanged === 1 ? "" : "s"}`}
                />
              ) : null}
              <ActionForm action={discardPaste.bind(null, orgId, run.id)} submit="Discard" variant="ghost" />
            </div>
          </>
        ) : (
          <>
            {run && run.status === "applied" ? (
              <Notice tone={run.rows_failed ? "error" : "success"}>
                Applied: {run.rows_changed} row{run.rows_changed === 1 ? "" : "s"} changed, {run.rows_unchanged} re-confirmed
                {run.rows_skipped ? `, ${run.rows_skipped} not applied` : ""}
                {run.rows_failed ? `, ${run.rows_failed} with problems (listed below)` : ""}.
              </Notice>
            ) : null}
            {run && run.status === "applied" && run.results.length ? (
              <RowTable rows={run.results} caption="Rows that need attention" />
            ) : null}
            <p className={ui.muted}>You’ll see every row checked before anything changes. Up to 2 MB or 5,000 rows at a time.</p>
            <ActionForm action={previewPaste.bind(null, orgId)} submit="Check the data" encType="multipart/form-data">
              <TextArea label="JSON or XML" name="data" rows={12} hint="In the Nilecruz inventory format v1." />
              <div className={ui.field}>
                <label className={ui.label} htmlFor="inventory-file">
                  Or choose a file (.json or .xml)
                </label>
                <input
                  id="inventory-file"
                  name="file"
                  type="file"
                  accept=".json,.xml,application/json,application/xml,text/xml"
                />
              </div>
            </ActionForm>
          </>
        )}
      </Section>

      <Section title="Feed" id="feed">
        {c.feed ? (
          <>
            <p className={ui.actions}>
              <Badge tone={FEED_STATUS[c.feed.status].tone}>{FEED_STATUS[c.feed.status].text}</Badge>
              {c.feed.status_reason ? <span>{c.feed.status_reason}</span> : null}
            </p>
            <dl className={ui.grid}>
              <div>
                <dt className={ui.label}>Address</dt>
                <dd className={ui.wrap}>{c.feed.url}</dd>
              </div>
              <div>
                <dt className={ui.label}>Last pull</dt>
                <dd>{c.feed.last_attempt_at ? <CairoTime value={c.feed.last_attempt_at} /> : "Not pulled yet"}</dd>
              </div>
              <div>
                <dt className={ui.label}>Next pull</dt>
                <dd>{c.feed.status === "active" && c.feed.next_pull_at ? <CairoTime value={c.feed.next_pull_at} /> : "—"}</dd>
              </div>
              <div>
                <dt className={ui.label}>Failures in a row</dt>
                <dd>{c.feed.consecutive_failures}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className={ui.muted}>No feed yet. Nilecruz pulls an approved feed every hour.</p>
        )}
        <ActionForm
          action={saveFeed.bind(null, orgId)}
          submit={c.feed ? "Change the address" : "Save and ask for approval"}
          variant="outline"
        >
          <Input
            label="Feed address"
            name="url"
            type="url"
            required
            defaultValue={c.feed?.url}
            hint="An https:// address on the public internet. A new or changed address needs Nilecruz’s approval before it is pulled."
          />
        </ActionForm>
        {c.feed ? <ActionForm action={removeFeed.bind(null, orgId)} submit="Remove the feed" variant="ghost" /> : null}
      </Section>

      <Section title="API keys" id="api">
        <p>
          Your system signs each request with a private key that only you hold; Nilecruz keeps the matching public key. Two keys
          can be active at once, so you can switch to a new key before revoking the old one. See{" "}
          <Link href={`${formatHref}#signing`}>signing requests</Link>.
        </p>
        {c.keys.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">API keys</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Key ID</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last used</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.keys.map((k) => (
                  <tr key={k.id}>
                    <th scope="row" data-label="Name">
                      {k.label}
                    </th>
                    <td data-label="Key ID">
                      <code>{k.key_id}</code>
                    </td>
                    <td data-label="Created">
                      <CairoTime value={k.created_at} />
                    </td>
                    <td data-label="Last used">{k.last_used_at ? <CairoTime value={k.last_used_at} /> : "Never"}</td>
                    <td data-label="Status">{k.revoked_at ? <Badge>Revoked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td data-label="Action">
                      {k.revoked_at ? null : (
                        <ActionForm action={revokeKey.bind(null, orgId, k.id)} submit={`Revoke ${k.label}`} variant="ghost" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {activeKeys.length < 2 ? (
          <ActionForm action={createKey.bind(null, orgId)} submit="Create a key" variant="outline" resetOnSuccess>
            <Input
              label="Key name"
              name="label"
              required
              maxLength={80}
              hint="The system that will use it, for example “Reservations system”."
            />
          </ActionForm>
        ) : (
          <p className={ui.muted}>Two keys are active. Revoke one to create another.</p>
        )}
      </Section>

      <Section title="Recent activity" id="activity">
        <RunsTable runs={c.runs} />
      </Section>
    </>
  );
}

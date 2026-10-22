import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { getDb } from "@/server/db";
import { addFreesale, adminSaveWebhook, extendHold, placeHold, releaseHold, saveWebhook, setFreesaleActive } from "./actions";

type Ship = { id: string; name: string; cabin_types: { id: string; name: string; active: boolean }[] };

async function shipsOf(orgId: string): Promise<Ship[]> {
  const db = await getDb();
  const { data } = await db
    .from("vessels")
    .select("id, name, cabin_types(id, name, active)")
    .eq("operator_org_id", orgId)
    .order("name");
  return data ?? [];
}
const cabinOptions = (ships: Ship[]) =>
  ships.flatMap((v) =>
    v.cabin_types.filter((c) => c.active).map((c) => ({ value: `${v.id}|${c.id}`, label: `${v.name} · ${c.name}` })),
  );

/**
 * ADR-103: the operator lets Nilecruz sell down to zero without asking, for a ship (or one cabin type) and a range of
 * departures. Recent manual, pasted or sheet availability then books instantly. Admins edit; the operator reads.
 */
export async function Freesales({ orgId, canEdit, hours }: { orgId: string; canEdit: boolean; hours: number }) {
  const db = await getDb();
  const [{ data: list }, ships] = await Promise.all([
    db
      .from("freesales")
      .select("id, starts_on, ends_on, contract_ref, active, vessel:vessels(name), cabin:cabin_types(name)")
      .eq("org_id", orgId)
      .order("starts_on"),
    canEdit ? shipsOf(orgId) : Promise.resolve([] as Ship[]),
  ]);
  return (
    <Section title="Freesale" id="freesale">
      <p className={ui.muted}>
        Departures Nilecruz may sell down to zero without asking. Availability entered by hand, pasted or from a vacancy sheet in
        the last {hours} hours books instantly; the operator is told of each booking.
      </p>
      {list?.length ? (
        <ul className={ui.list}>
          {list.map((f) => (
            <li key={f.id} className={ui.actions}>
              <span>
                <strong>
                  {f.vessel?.name} · {f.cabin?.name ?? "all cabin types"}
                </strong>{" "}
                · departures {f.starts_on} to {f.ends_on}
                {f.contract_ref ? ` · contract ${f.contract_ref}` : ""}
                {f.active ? "" : " · switched off"}
              </span>
              {canEdit ? (
                <ActionForm
                  action={setFreesaleActive.bind(null, orgId, f.id, !f.active)}
                  submit={f.active ? "Switch off" : "Switch on"}
                  variant="ghost"
                >
                  {null}
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No freesale agreements.</p>
      )}
      {canEdit ? (
        <ActionForm action={addFreesale.bind(null, orgId)} submit="Add freesale" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Select
              label="Ship and cabin type"
              name="cabin"
              required
              placeholder="Choose"
              options={ships.flatMap((v) => [{ value: v.id, label: `${v.name} · all cabin types` }, ...cabinOptions([v])])}
            />
            <Input label="Departures from" name="starts_on" type="date" required />
            <Input label="to" name="ends_on" type="date" required />
            <Input label="Contract reference" name="contract_ref" maxLength={120} />
          </div>
        </ActionForm>
      ) : null}
    </Section>
  );
}

/**
 * ADR-103: cabins held on a sailing until a time: an operator's "Hold 72h" answer, or a hold Nilecruz placed. Held
 * cabins are off availability while the hold lasts. Admins place, extend (any) and release (their own); the operator reads.
 */
export async function Holds({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const db = await getDb();
  const [{ data: list }, ships] = await Promise.all([
    db
      .from("holds")
      .select(
        "id, cabins, expires_at, note, booking_request_id, vessel:vessels(name), cabin:cabin_types(name), departure:departures(departs_on), request:booking_requests(reference)",
      )
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("expires_at"),
    canEdit ? shipsOf(orgId) : Promise.resolve([] as Ship[]),
  ]);
  return (
    <Section title="Holds" id="holds">
      <p className={ui.muted}>
        Cabins held until a time, soonest to end first. When a hold ends without a booking, its cabins are free again.
      </p>
      {list?.length ? (
        <ul className={ui.list}>
          {list.map((h) => (
            <li key={h.id} className={ui.actions}>
              <span>
                <strong>
                  {h.vessel?.name} · {h.cabin?.name}
                </strong>{" "}
                · {h.departure?.departs_on} · {h.cabins} {h.cabins === 1 ? "cabin" : "cabins"} · until{" "}
                <CairoTime value={h.expires_at} /> ·{" "}
                {h.request ? `operator's answer to ${h.request.reference}` : "placed by Nilecruz"}
                {h.note ? ` · ${h.note}` : ""}
              </span>
              {canEdit ? (
                <>
                  <ActionForm action={extendHold.bind(null, orgId, h.id)} submit="Extend 24 h" variant="ghost">
                    {null}
                  </ActionForm>
                  {h.booking_request_id ? null : (
                    <ActionForm action={releaseHold.bind(null, orgId, h.id)} submit="Release" variant="ghost">
                      {null}
                    </ActionForm>
                  )}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No active holds.</p>
      )}
      {canEdit ? (
        <ActionForm action={placeHold.bind(null, orgId)} submit="Place hold" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Select label="Ship and cabin type" name="cabin" required placeholder="Choose" options={cabinOptions(ships)} />
            <Input label="Departure" name="departs_on" type="date" required />
            <Input label="Cabins" name="cabins" type="number" min={1} max={50} defaultValue={1} required />
            <Input label="For (hours)" name="hours" type="number" min={1} max={168} defaultValue={72} required />
            <Input label="Note" name="note" maxLength={500} hint="For example the group or client it's for." />
          </div>
        </ActionForm>
      ) : null}
    </Section>
  );
}

const EVENT_LABEL: Record<string, string> = {
  "inventory.changed": "Availability changed",
  "hold.expired": "Hold expired",
  "booking.confirmed": "Booking confirmed",
};

/**
 * ADR-103: where Nilecruz sends inventory.changed, hold.expired and booking.confirmed, signed with its key (see the
 * format page), and how the last deliveries went. The operator's owners set it; catalogue admins can too.
 */
export async function Webhook({ orgId, admin, canEdit = true }: { orgId: string; admin: boolean; canEdit?: boolean }) {
  const db = await getDb();
  const [{ data: endpoint }, { data: recent }] = await Promise.all([
    db.from("webhook_endpoints").select("url, last_sent_at, last_error, last_error_at").eq("org_id", orgId).maybeSingle(),
    db
      .from("webhook_deliveries")
      .select("id, event, status, attempts, last_error, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return (
    <Section title="Webhooks" id="webhooks">
      <p className={ui.muted}>
        Nilecruz tells your system when availability changes here (a booking, a hold, a vacancy sheet, an answer to a request),
        when a hold expires and when a booking is confirmed. Changes your own feed or API call made aren’t sent back. Each call is
        a signed JSON POST, tried again for 24 hours until your server answers 2xx.
      </p>
      {endpoint ? (
        <p>
          Last delivered: {endpoint.last_sent_at ? <CairoTime value={endpoint.last_sent_at} /> : "not yet"}
          {endpoint.last_error && endpoint.last_error_at ? (
            <>
              {" "}
              · last problem <CairoTime value={endpoint.last_error_at} />: {endpoint.last_error}
            </>
          ) : null}
        </p>
      ) : null}
      {recent?.length ? (
        <ul className={ui.list} aria-label="Latest deliveries">
          {recent.map((d) => (
            <li key={d.id} className={ui.muted}>
              <CairoTime value={d.created_at} /> · {EVENT_LABEL[d.event] ?? d.event} ·{" "}
              {d.status === "sent"
                ? "delivered"
                : d.status === "failed"
                  ? `not delivered (${d.last_error ?? "gave up"})`
                  : "waiting"}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <ActionForm
          action={(admin ? adminSaveWebhook : saveWebhook).bind(null, orgId)}
          submit="Save webhook address"
          variant="outline"
        >
          <Input
            label="Webhook address"
            name="url"
            type="url"
            maxLength={500}
            defaultValue={endpoint?.url}
            hint="https only. Leave empty to stop webhooks."
          />
        </ActionForm>
      ) : (
        <p>{endpoint ? endpoint.url : "No webhook address."}</p>
      )}
    </Section>
  );
}

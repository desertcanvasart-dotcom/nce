import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { getDb } from "@/server/db";
import { addAllotment, setAllotmentActive } from "./actions";

/**
 * ADR-100: cabins the operator contracts to Nilecruz. Until each sailing's release date they book instantly; bookings
 * count against them; after the release date unsold cabins go back to the operator. Admins edit; the operator reads.
 */
export async function Allotments({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const db = await getDb();
  const [{ data: list }, { data: ships }] = await Promise.all([
    db
      .from("allotments")
      .select("id, starts_on, ends_on, cabins, release_days, contract_ref, active, vessel:vessels(name), cabin:cabin_types(name)")
      .eq("org_id", orgId)
      .order("starts_on"),
    canEdit
      ? db.from("vessels").select("id, name, cabin_types(id, name, active)").eq("operator_org_id", orgId).order("name")
      : Promise.resolve({
          data: [] as { id: string; name: string; cabin_types: { id: string; name: string; active: boolean }[] }[],
        }),
  ]);
  const usage = new Map<string, { departs_on: string; cabins: number; booked: number; released: boolean }[]>();
  for (const a of (list ?? []).filter((x) => x.active)) {
    const { data } = await db.rpc("allotment_usage", { target: a.id });
    usage.set(a.id, (data ?? []).slice(0, 6));
  }
  return (
    <Section title="Allotments" id="allotments">
      <p className={ui.muted}>
        Cabins contracted to Nilecruz, per sailing. Until each sailing’s release date they book instantly for customers and travel
        partners, whatever the age of other availability; after it, unsold cabins go back to the operator.
      </p>
      {list?.length ? (
        <ul className={ui.list}>
          {list.map((a) => (
            <li key={a.id}>
              <strong>
                {a.vessel?.name} · {a.cabin?.name}
              </strong>{" "}
              · {a.cabins} {a.cabins === 1 ? "cabin" : "cabins"} a sailing, departures {a.starts_on} to {a.ends_on}, released{" "}
              {a.release_days} days before
              {a.contract_ref ? ` · contract ${a.contract_ref}` : ""}
              {a.active ? "" : " · switched off"}
              {usage.get(a.id)?.length ? (
                <ul>
                  {usage.get(a.id)!.map((u) => (
                    <li key={u.departs_on} className={ui.muted}>
                      {u.departs_on}: {u.booked} of {u.cabins} booked{u.released ? " · released" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEdit ? (
                <ActionForm
                  action={setAllotmentActive.bind(null, orgId, a.id, !a.active)}
                  submit={a.active ? "Switch off" : "Switch on"}
                  variant="ghost"
                >
                  {null}
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No allotments.</p>
      )}
      {canEdit ? (
        <ActionForm action={addAllotment.bind(null, orgId)} submit="Add allotment" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Select
              label="Ship and cabin type"
              name="cabin"
              required
              placeholder="Choose"
              options={(ships ?? []).flatMap((v) =>
                v.cabin_types.filter((c) => c.active).map((c) => ({ value: `${v.id}|${c.id}`, label: `${v.name} · ${c.name}` })),
              )}
            />
            <Input label="Departures from" name="starts_on" type="date" required />
            <Input label="to" name="ends_on" type="date" required />
            <Input label="Cabins per sailing" name="cabins" type="number" min={1} max={100} required />
            <Input
              label="Release (days before departure)"
              name="release_days"
              type="number"
              min={0}
              max={120}
              defaultValue={14}
              required
            />
            <Input label="Contract reference" name="contract_ref" maxLength={120} />
          </div>
        </ActionForm>
      ) : null}
    </Section>
  );
}

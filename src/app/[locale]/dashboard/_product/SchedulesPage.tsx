import Link from "next/link";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, Select, ui } from "@/components/dashboard/ui";
import { WEEKDAYS } from "@/lib/product/departures";
import { SAILING_PERIODS, whenText, type SailingPeriod } from "@/lib/product/sailing-time";
import { requireProductEditor } from "@/server/product/guard";
import { schedulesOf } from "@/server/product/queries";
import { saveSchedule } from "./actions";
import { productPaths } from "./paths";
import { SalesControls } from "./SalesControls";

const days = (xs: number[]) => xs.map((d) => WEEKDAYS.find((w) => w.value === d)?.label.slice(0, 3)).join(", ");

/** DASH-ADM-051, 052: a vessel can have several directional schedules. */
export async function SchedulesPage({ orgId, vesselId }: { orgId: string | null; vesselId: string }) {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.schedules, { orgId: orgId ?? undefined });
  const list = await schedulesOf(vesselId);
  return (
    <>
      <p>
        <Link href={p.back}>← Back</Link>
      </p>
      <h1 className={ui.pageTitle}>Routes, schedules and rates · {vessel.name}</h1>
      <Section title="Schedules" id="schedules">
        {list.length ? (
          <ul className={ui.list}>
            {list.map((s) => (
              <li key={s.id}>
                <Link href={p.schedule(s.id)}>
                  {s.origin} → {s.destination}, {s.nights} nights
                </Link>{" "}
                <span className={ui.muted}>
                  ({s.code} · sails {days(s.sailing_days)}
                  {s.sailing_period ? ` ${whenText(s.sailing_period, s.sails_at)}` : ""} ·{" "}
                  {(s.departures as unknown as { count: number }[])[0]?.count ?? 0} departures
                  {s.active ? "" : " · inactive"})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No schedules yet.</p>
        )}
      </Section>
      <Section title="Add a schedule" id="add">
        <p className={ui.muted}>Schedules are directional: Luxor → Aswan and Aswan → Luxor are two schedules.</p>
        <ActionForm action={saveSchedule.bind(null, orgId, vesselId, null)} submit="Add schedule">
          <ScheduleFields />
        </ActionForm>
      </Section>
      <SalesControls orgId={orgId} vesselId={vesselId} />
    </>
  );
}

export function ScheduleFields({
  value,
}: {
  value?: {
    code: string;
    origin: string;
    destination: string;
    nights: number;
    sailing_days: number[];
    active: boolean;
    sailing_period: SailingPeriod | null;
    sails_at: string | null;
  };
}) {
  return (
    <>
      <div className={ui.grid}>
        <Input label="From" name="origin" required maxLength={80} defaultValue={value?.origin} hint="For example Luxor." />
        <Input
          label="To"
          name="destination"
          required
          maxLength={80}
          defaultValue={value?.destination}
          hint="For example Aswan."
        />
        <Input label="Nights" name="nights" inputMode="numeric" required defaultValue={value?.nights ?? 4} />
        <Input label="Code" name="code" required maxLength={40} defaultValue={value?.code} hint="Used by feeds: LXR-ASW-4." />
      </div>
      <div className={ui.grid}>
        <Select
          label="Sails on the first day"
          name="sailing_period"
          placeholder="Not set"
          options={SAILING_PERIODS}
          defaultValue={value?.sailing_period}
          hint="Travellers on a morning sailing are told to arrive the day before."
        />
        <Input
          label="Exact time (optional)"
          name="sails_at"
          inputMode="numeric"
          maxLength={5}
          defaultValue={value?.sails_at?.slice(0, 5)}
          hint="Cairo time, HH:MM, for example 08:00."
        />
      </div>
      <Checkboxes
        legend="Sailing days"
        name="sailing_days"
        options={WEEKDAYS.map((w) => ({ value: String(w.value), label: w.label }))}
        checked={(value?.sailing_days ?? []).map(String)}
      />
      {value ? (
        <Checkboxes
          legend="Status"
          name="active"
          options={[{ value: "yes", label: "Active" }]}
          checked={value.active ? ["yes"] : []}
        />
      ) : null}
    </>
  );
}

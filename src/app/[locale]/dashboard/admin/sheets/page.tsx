import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { ACCEPTED } from "@/server/sheets/ingest";
import { SHEET_STATUS } from "./status";
import { uploadSheet } from "./actions";

/** ADR-099, Part B: vacancy sheets from operators (email, WhatsApp, upload), waiting for review and recent. */
export default async function Sheets() {
  await requireAdmin(["catalogue"], "/dashboard/admin/sheets/");
  const db = await getDb();
  const [{ data: sheets }, { data: operators }] = await Promise.all([
    db
      .from("sheet_ingests")
      .select("id, status, channel, sender, file_name, received_at, sheet_date, operator:organisations(display_name)")
      .order("received_at", { ascending: false })
      .limit(100),
    db.from("organisations").select("id, display_name").eq("kind", "operator").eq("status", "approved").order("display_name"),
  ]);
  const open = (sheets ?? []).filter((s) => ["received", "unknown_sender", "preview", "failed"].includes(s.status));
  return (
    <>
      <h1 className={ui.pageTitle}>Vacancy sheets</h1>
      <p>
        Operators without a system send the weekly sheet they already send agents. Each is read into the Nilecruz format and waits
        here for you to check and confirm. Nothing changes on the site until you confirm.
      </p>
      <Section title={`To review (${open.length})`} id="open">
        {open.length ? <SheetList sheets={open} /> : <p className={ui.muted}>Nothing waiting.</p>}
      </Section>
      <Section title="Upload a sheet" id="upload">
        <ActionForm action={uploadSheet} submit="Read this sheet" encType="multipart/form-data">
          <Select
            label="Operator"
            name="org_id"
            required
            placeholder="Choose"
            options={(operators ?? []).map((o) => ({ value: o.id, label: o.display_name }))}
          />
          <label className={ui.field}>
            <span className={ui.label}>File ({ACCEPTED}, up to 15 MB)</span>
            <input type="file" name="file" accept={ACCEPTED} required />
          </label>
        </ActionForm>
      </Section>
      <Section title="Recent" id="recent">
        <SheetList sheets={(sheets ?? []).slice(0, 40)} />
      </Section>
    </>
  );
}

function SheetList({
  sheets,
}: {
  sheets: {
    id: string;
    status: string;
    channel: string;
    sender: string | null;
    file_name: string | null;
    received_at: string;
    sheet_date: string | null;
    operator: { display_name: string } | null;
  }[];
}) {
  return (
    <ul className={ui.list}>
      {sheets.map((s) => (
        <li key={s.id}>
          <Link href={`/dashboard/admin/sheets/${s.id}/`}>{s.file_name ?? "Message text"}</Link> ·{" "}
          {s.operator?.display_name ?? "Unknown sender"} · {s.channel}
          {s.sender ? ` from ${s.sender}` : ""} · <CairoTime value={s.received_at} />
          {s.sheet_date ? ` · as of ${s.sheet_date}` : ""}{" "}
          <Badge tone={SHEET_STATUS[s.status]!.tone}>{SHEET_STATUS[s.status]!.text}</Badge>
        </li>
      ))}
    </ul>
  );
}

import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { autoConfirmProblems, mapRows, type Alias, type OperatorShip, type SheetRow } from "@/lib/sheets/map";
import { gridText, PARSER_VERSION, readPlainTable, type Grid } from "@/lib/sheets/read";
import { getAdminDb } from "@/server/db/admin";
import { sendEmail, sendWhatsAppText } from "@/server/messaging/send";
import { aiReaderOn, extractWithClaude } from "./extract";

/**
 * ADR-099, Part B: a vacancy sheet from email, WhatsApp or an admin's upload, read into the Nilecruz format and sent to
 * the existing preview. Runs with the admin client (no one is signed in for email and WhatsApp); every change is still
 * audited, and nothing is applied until an admin confirms (or the operator's auto-confirm passes every check).
 */
export const MAX_BYTES = 15 * 1024 * 1024;
const KINDS: Record<string, "xlsx" | "xls" | "csv" | "pdf" | "jpg" | "png"> = {
  xlsx: "xlsx",
  xls: "xls",
  csv: "csv",
  pdf: "pdf",
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
};
export const ACCEPTED = ".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png";
const STORED_TYPE: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};
const kindOf = (name: string | null) => (name ? KINDS[name.toLowerCase().split(".").pop() ?? ""] : undefined);
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120) || "sheet";

/**
 * The operator whose contact sent it: an email address or WhatsApp number on operator_contacts. The address is matched
 * exactly (SEC-011, Batch 11): LIKE wildcards in a sender are escaped, so "%@%" matches nothing.
 */
async function operatorFor(sender: string | null): Promise<string | null> {
  if (!sender) return null;
  const db = getAdminDb();
  const s = sender.trim().toLowerCase();
  const { data } = s.startsWith("+")
    ? await db.from("operator_contacts").select("org_id").eq("whatsapp", s).limit(1).maybeSingle()
    : await db
        .from("operator_contacts")
        .select("org_id")
        .ilike("email", s.replace(/[\\%_]/g, "\\$&"))
        .limit(1)
        .maybeSingle();
  return data?.org_id ?? null;
}

export async function receiveSheet(input: {
  channel: "email" | "whatsapp" | "upload";
  sender: string | null;
  orgId?: string | null;
  fileName: string | null;
  contentType: string | null;
  bytes: Buffer | null;
  bodyText?: string | null;
}): Promise<string> {
  if (input.bytes && input.bytes.length > MAX_BYTES) throw new Error("The file is larger than 15 MB.");
  if (input.bytes && !kindOf(input.fileName))
    throw new Error("Send .xlsx, .xls, .csv, .pdf, .jpg or .png, or the vacancies as text.");
  const db = getAdminDb();
  const orgId = input.orgId ?? (await operatorFor(input.sender));
  const { data: row, error } = await db
    .from("sheet_ingests")
    .insert({
      org_id: orgId,
      channel: input.channel,
      sender: input.sender?.slice(0, 320) ?? null,
      file_name: input.fileName?.slice(0, 200) ?? null,
      content_type: input.contentType?.slice(0, 120) ?? null,
      size_bytes: input.bytes?.length ?? null,
      body_text: input.bodyText?.slice(0, 50000) ?? null,
      status: orgId ? "received" : "unknown_sender",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.bytes && input.fileName) {
    const path = `${row.id}/${safeName(input.fileName)}`;
    const { error: up } = await db.storage
      .from("sheets")
      // SEC-011: the sender's content type isn't trusted; the type comes from the accepted file extension.
      .upload(path, input.bytes, { contentType: STORED_TYPE[kindOf(input.fileName) ?? ""] ?? "application/octet-stream" });
    if (up) throw up;
    await db.from("sheet_ingests").update({ file_path: path }).eq("id", row.id);
  }
  await processSheet(row.id);
  return row.id;
}

async function operatorData(orgId: string) {
  const db = getAdminDb();
  const [{ data: org }, { data: vessels }, { data: aliases }] = await Promise.all([
    db.from("organisations").select("display_name").eq("id", orgId).single(),
    db
      .from("vessels")
      .select("slug, name, cabin_count, cabin_types(code, name, active, cabin_count)")
      .eq("operator_org_id", orgId),
    db.from("operator_aliases").select("kind, sheet_name, target, vessel_slug").eq("org_id", orgId),
  ]);
  const ships: OperatorShip[] = (vessels ?? []).map((v) => ({
    slug: v.slug,
    name: v.name,
    cabinCount: v.cabin_count,
    cabins: v.cabin_types.filter((c) => c.active).map((c) => ({ code: c.code, name: c.name, cabinCount: c.cabin_count })),
  }));
  return { name: org?.display_name ?? "Operator", ships, aliases: (aliases ?? []) as Alias[] };
}

async function gridFrom(kind: "xlsx" | "csv", bytes: Buffer): Promise<Grid> {
  if (kind === "csv") return Papa.parse<string[]>(bytes.toString("utf8"), { skipEmptyLines: true }).data;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  const grid: Grid = [];
  // Every worksheet, one after another (operators often keep one tab per ship or month).
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (r) => {
      const cells: Grid[number] = [];
      r.eachCell({ includeEmpty: true }, (c, i) => {
        const v = c.value;
        cells[i - 1] = v instanceof Date || typeof v === "number" ? v : v === null || v === undefined ? null : c.text;
      });
      grid.push(Array.from(cells, (x) => x ?? null));
    });
  });
  return grid;
}

/** The rows as written, and the sheet's date, from whatever arrived. */
async function readRows(
  s: { file_name: string | null; body_text: string | null; received_at: string },
  bytes: Buffer | null,
  op: Awaited<ReturnType<typeof operatorData>>,
) {
  const kind = kindOf(s.file_name);
  const context = {
    operator: op.name,
    ships: op.ships.map((x) => ({ name: x.name, cabins: x.cabins.map((c) => c.name) })),
    receivedOn: s.received_at.slice(0, 10),
  };
  let grid: Grid | null = null;
  if (bytes && (kind === "xlsx" || kind === "csv")) grid = await gridFrom(kind, bytes);
  else if (!bytes && s.body_text)
    grid = s.body_text.split(/\r?\n/).map((l) => l.split(/\t|;|\||,(?=\s*\S)/).map((x) => x.trim()));
  if (grid) {
    const plain = readPlainTable(grid);
    if (plain && plain.rows.length)
      return {
        rows: plain.rows,
        sheetDate: plain.sheetDate,
        notes: plain.skipped
          ? [`${plain.skipped} line${plain.skipped === 1 ? "" : "s"} couldn't be read and were left out.`]
          : [],
        parser: `${PARSER_VERSION}/table`,
      };
    if (!aiReaderOn())
      throw new Error("This sheet isn't a plain table and the AI reader is off (ANTHROPIC_API_KEY). Enter the rows by hand.");
    const x = await extractWithClaude({ kind: "text", text: gridText(grid).slice(0, 200_000) }, context);
    return { rows: x.rows, sheetDate: x.sheetDate, notes: x.notes, parser: `${PARSER_VERSION}/${x.model}` };
  }
  if (bytes && kind === "xls")
    throw new Error("Old Excel (.xls) files can't be read. Ask the operator for .xlsx, CSV or PDF, or upload one.");
  if (bytes && (kind === "pdf" || kind === "jpg" || kind === "png")) {
    if (!aiReaderOn()) throw new Error("PDFs and photos need the AI reader (ANTHROPIC_API_KEY). Enter the rows by hand.");
    const x = await extractWithClaude(
      kind === "pdf"
        ? { kind: "pdf", base64: bytes.toString("base64") }
        : { kind: "image", base64: bytes.toString("base64"), mediaType: kind === "png" ? "image/png" : "image/jpeg" },
      context,
    );
    return { rows: x.rows, sheetDate: x.sheetDate, notes: x.notes, parser: `${PARSER_VERSION}/${x.model}` };
  }
  throw new Error("Nothing to read in this message.");
}

/** Read (first time only), map with the aliases, preview, and auto-confirm when the operator allows it and every check passes. */
export async function processSheet(id: string, { reread = false }: { reread?: boolean } = {}) {
  const db = getAdminDb();
  const { data: s } = await db.from("sheet_ingests").select("*").eq("id", id).single();
  if (!s || s.status === "confirmed" || s.status === "rejected" || !s.org_id) return;
  const op = await operatorData(s.org_id);
  let raw = s.raw_rows as SheetRow[] | null;
  let sheetDate = s.sheet_date;
  let notes = s.notes as string[];
  let parser = s.parser_version;
  if (!raw || reread) {
    try {
      const bytes = s.file_path
        ? Buffer.from(await (await db.storage.from("sheets").download(s.file_path)).data!.arrayBuffer())
        : null;
      const read = await readRows(s, bytes, op);
      raw = read.rows;
      sheetDate = read.sheetDate;
      notes = read.notes;
      parser = read.parser;
    } catch (e) {
      await db
        .from("sheet_ingests")
        .update({ status: "failed", error: e instanceof Error ? e.message : String(e) })
        .eq("id", id);
      return;
    }
  }
  const mapped = mapRows(raw, op.ships, op.aliases);
  await db
    .from("sheet_ingests")
    .update({
      raw_rows: raw,
      rows: mapped.rows,
      unmatched: mapped.unmatched,
      notes,
      sheet_date: sheetDate,
      parser_version: parser,
      error: null,
    })
    .eq("id", id);
  const { error } = await db.rpc("preview_sheet", { ingest: id });
  if (error) {
    await db.from("sheet_ingests").update({ status: "failed", error: error.message }).eq("id", id);
    return;
  }
  await maybeAutoConfirm(id);
}

async function maybeAutoConfirm(id: string) {
  const db = getAdminDb();
  const { data: s } = await db.from("sheet_ingests").select("*, run:inventory_runs(results)").eq("id", id).single();
  if (!s?.org_id) return;
  const { data: settings } = await db
    .from("operator_settings")
    .select("sheet_auto_confirm, sheet_ack")
    .eq("org_id", s.org_id)
    .maybeSingle();
  if (!settings?.sheet_auto_confirm) return;
  const op = await operatorData(s.org_id);
  const today = new Date().toISOString().slice(0, 10);
  const slugs = op.ships.map((x) => x.slug);
  const [{ count: sailings }, { data: latest }] = await Promise.all([
    db
      .from("departures")
      .select("id, vessel:vessels!inner(slug)", { count: "exact", head: true })
      .in("vessel.slug", slugs)
      .gt("departs_on", today)
      .eq("status", "scheduled"),
    db
      .from("inventory")
      .select("confirmed_at, vessel:vessels!inner(operator_org_id)")
      .eq("vessel.operator_org_id", s.org_id)
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const results = (s.run as { results: { status: string; vessel: string; date: string }[] } | null)?.results ?? [];
  const changed = new Set(
    results.filter((r) => r.status === "changed" || r.status === "new").map((r) => `${r.vessel}/${r.date}`),
  );
  const problems = autoConfirmProblems({
    operatorKnown: s.channel === "upload" || !!s.org_id,
    channel: s.channel as "email" | "whatsapp" | "upload",
    unmatched: (s.unmatched as unknown[]).length,
    rows: s.rows as never,
    ships: op.ships,
    changedShare: sailings ? changed.size / sailings : 1,
    sheetDate: s.sheet_date,
    latestDataAt: latest?.confirmed_at ?? null,
  });
  if (results.some((r) => r.status === "error")) problems.push("Some rows didn't pass the checks.");
  if (problems.length) {
    await db
      .from("sheet_ingests")
      .update({ notes: [...(s.notes as string[]), ...problems.map((p) => `Not auto-confirmed: ${p}`)] })
      .eq("id", id);
    return;
  }
  const { data: out, error } = await db.rpc("confirm_sheet", { ingest: id, auto: true });
  if (error) return;
  if (settings.sheet_ack) await acknowledge(s.channel, s.sender, s.org_id, (out as { changed: number }).changed);
}

/** "Received: 38 sailings updated." to the sender, when the operator has asked for it. */
export async function acknowledge(channel: string, sender: string | null, orgId: string, changed: number) {
  if (!sender || channel === "upload") return;
  const text = `Received, thank you: ${changed} ${changed === 1 ? "row" : "rows"} of availability updated on Nilecruz.`;
  if (channel === "whatsapp") await sendWhatsAppText(sender, text, { kind: "sheet.ack", orgId });
  else
    await sendEmail(
      sender,
      { subject: "Your vacancy sheet is on Nilecruz", text, html: `<p>${text}</p>` },
      { kind: "sheet.ack", orgId },
    );
}

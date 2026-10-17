import "server-only";
import { cairoOffsetHours } from "@/lib/time/cairo";
import { getDb } from "@/server/db";

/** DASH-ADM-008: the audit log, made readable: who, what, which record, when. */
export type ActivityFilter = { page?: number; pageSize?: number; table?: string; from?: string; to?: string; actor?: string };

const TABLE_LABEL: Record<string, string> = {
  vessels: "Vessel",
  vessel_private: "Vessel source facts",
  media: "Photo",
  evaluations: "Evaluation",
  external_ratings: "External rating",
  safety_observations: "Safety observation",
  organisations: "Company",
  memberships: "Team member",
  org_invitations: "Invitation",
  profiles: "Account role",
  vessel_submissions: "Submission",
  vessel_import_batches: "CSV import",
  destinations: "Destination",
};
export const ACTIVITY_TABLES = Object.entries(TABLE_LABEL).map(([value, label]) => ({ value, label }));

const VERB: Record<string, string> = {
  insert: "Created",
  update: "Changed",
  delete: "Deleted",
  role_change: "Changed role",
  submitted: "Submitted",
  changes_requested: "Requested changes",
  approved: "Approved",
  rejected: "Rejected",
};

export type ActivityRow = {
  id: number;
  at: string;
  who: string;
  what: string;
  record: string;
  href: string | null;
  changed: string[];
};

export async function recentActivity(f: ActivityFilter) {
  const db = await getDb();
  const size = f.pageSize ?? 50;
  const page = Math.max(1, f.page ?? 1);
  let q = db
    .from("audit_log")
    .select("id, occurred_at, actor_id, action, table_name, row_id, old_data, new_data", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (f.table) q = q.eq("table_name", f.table);
  if (f.actor) q = q.eq("actor_id", f.actor);
  // Dates are Cairo calendar days; the offset (UTC+2 or +3 in summer time) is the one in force that day.
  const cairo = (day: string, time: string) => {
    const h = cairoOffsetHours(new Date(`${day}T12:00:00Z`));
    return `${day}T${time}+0${h}:00`;
  };
  if (f.from) q = q.gte("occurred_at", cairo(f.from, "00:00:00"));
  if (f.to) q = q.lte("occurred_at", cairo(f.to, "23:59:59"));
  const { data, count, error } = await q;
  if (error) throw error;
  const actors = [...new Set((data ?? []).map((r) => r.actor_id).filter((a): a is string => !!a))];
  const { data: people } = actors.length ? await db.from("profiles").select("id, full_name").in("id", actors) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "A team member"]));

  const rows: ActivityRow[] = (data ?? []).map((r) => {
    const [table, verb] = r.action.split(".") as [string, string];
    const n = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>;
    const o = (r.old_data ?? {}) as Record<string, unknown>;
    const changed =
      verb === "update" && r.old_data && r.new_data
        ? Object.keys(n).filter((k) => k !== "updated_at" && JSON.stringify(n[k]) !== JSON.stringify(o[k]))
        : [];
    const label = typeof n.name === "string" ? n.name : typeof n.display_name === "string" ? n.display_name : (r.row_id ?? "");
    const vesselId = table === "vessels" ? r.row_id : typeof n.vessel_id === "string" ? n.vessel_id : null;
    return {
      id: r.id,
      at: r.occurred_at,
      who: r.actor_id ? (name.get(r.actor_id) ?? "A team member") : "System or import",
      what: `${VERB[verb] ?? verb} ${(TABLE_LABEL[table] ?? table).toLowerCase()}`,
      record: String(label),
      href: vesselId ? `/dashboard/admin/catalogue/${vesselId}/` : null,
      changed,
    };
  });
  return { rows, total: count ?? 0, page, pages: Math.max(1, Math.ceil((count ?? 0) / size)) };
}

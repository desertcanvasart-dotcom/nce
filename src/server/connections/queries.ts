import "server-only";
import { getDb } from "@/server/db";
import type { Tables } from "@/server/db/database.types";

export type Feed = Tables<"inventory_feeds">;
export type Run = Pick<
  Tables<"inventory_runs">,
  | "id"
  | "source"
  | "status"
  | "label"
  | "rows_received"
  | "rows_changed"
  | "rows_unchanged"
  | "rows_skipped"
  | "rows_failed"
  | "error"
  | "created_at"
  | "finished_at"
>;
export type ApiKey = Pick<Tables<"api_keys">, "id" | "key_id" | "label" | "created_at" | "last_used_at" | "revoked_at">;
export type RowResult = {
  i: number;
  label: string;
  status: "new" | "changed" | "unchanged" | "skipped" | "error";
  messages: string[];
};

const RUN_COLUMNS =
  "id, source, status, label, rows_received, rows_changed, rows_unchanged, rows_skipped, rows_failed, error, created_at, finished_at";

/** Health of one route (DASH-OPR-027): last success, last problem, rows changed, how old the data is. */
export type Health = {
  route: "paste" | "feed" | "api";
  state: "unused" | "ok" | "problem" | "waiting";
  lastSuccess: string | null;
  lastProblem: string | null;
  rowsChanged: number | null;
};

function healthOf(route: Health["route"], runs: Run[], feed: Feed | null): Health {
  const mine = runs.filter((r) => r.source === route && (r.status === "applied" || r.status === "failed"));
  const success = mine.find((r) => r.status === "applied");
  const latest = mine[0];
  const base: Health = {
    route,
    state: latest ? (latest.status === "failed" || latest.rows_failed > 0 ? "problem" : "ok") : "unused",
    lastSuccess: success?.finished_at ?? null,
    lastProblem: latest?.error ?? null,
    rowsChanged: success?.rows_changed ?? null,
  };
  if (route === "feed" && feed) {
    return {
      ...base,
      state:
        feed.status === "pending" ? "waiting" : feed.status !== "active" ? "problem" : feed.last_error ? "problem" : base.state,
      lastSuccess: feed.last_success_at ?? base.lastSuccess,
      lastProblem:
        feed.status === "rejected" || feed.status === "paused"
          ? (feed.status_reason ?? null)
          : (feed.last_error ?? base.lastProblem),
      rowsChanged: feed.last_rows_changed ?? base.rowsChanged,
    };
  }
  return base;
}

export async function connectionsFor(orgId: string) {
  const db = await getDb();
  const [feed, keys, runs] = await Promise.all([
    db.from("inventory_feeds").select("*").eq("org_id", orgId).maybeSingle(),
    db
      .from("api_keys")
      .select("id, key_id, label, created_at, last_used_at, revoked_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    db
      .from("inventory_runs")
      .select(RUN_COLUMNS)
      .eq("org_id", orgId)
      .in("status", ["applied", "failed"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const r of [feed, keys, runs]) if (r.error) throw r.error;
  const runList = (runs.data ?? []) as Run[];
  return {
    feed: feed.data as Feed | null,
    keys: (keys.data ?? []) as ApiKey[],
    runs: runList,
    health: (["paste", "feed", "api"] as const).map((r) => healthOf(r, runList, feed.data)),
  };
}

export async function pastePreview(orgId: string, runId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("inventory_runs")
    .select(`${RUN_COLUMNS}, results`)
    .eq("id", runId)
    .eq("org_id", orgId)
    .eq("source", "paste")
    .maybeSingle();
  if (error) throw error;
  return data ? { ...(data as Run), results: data.results as RowResult[] } : null;
}

/** What the operator overview lists (DASH-OPR-005): connection problems join the inventory issues. */
export async function connectionIssues(orgId: string): Promise<string[]> {
  const { feed, health } = await connectionsFor(orgId).catch(() => ({ feed: null, health: [] as Health[] }));
  const issues: string[] = [];
  if (feed?.status === "pending") issues.push("Your inventory feed is waiting for Nilecruz’s approval.");
  if (feed?.status === "rejected") issues.push(`Your inventory feed was not approved: ${feed.status_reason ?? ""}`.trim());
  if (feed?.status === "paused") issues.push(`Your inventory feed is paused: ${feed.status_reason ?? ""}`.trim());
  for (const h of health) {
    if (h.state === "problem" && h.lastProblem && !(h.route === "feed" && feed && feed.status !== "active")) {
      issues.push(`${ROUTE_LABEL[h.route]}: ${h.lastProblem}`);
    }
  }
  return issues;
}

export const ROUTE_LABEL = {
  manual: "Manual entry",
  paste: "Paste",
  feed: "Feed",
  api: "API",
  tap: "Request answer",
  sheet: "Vacancy sheet",
} as const;

/** Admin overview (DASH-ADM-006) and the operators list (DASH-ADM-045). */
export async function adminConnectionCounts() {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [failing, pending, apiProblems] = await Promise.all([
    db.from("inventory_feeds").select("id", { count: "exact", head: true }).eq("status", "active").not("last_error", "is", null),
    db.from("inventory_feeds").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("inventory_runs").select("org_id").eq("source", "api").gt("rows_failed", 0).gte("created_at", since),
  ]);
  const apiOrgs = new Set((apiProblems.data ?? []).map((r) => r.org_id));
  return { errors: (failing.count ?? 0) + apiOrgs.size, pendingFeeds: pending.count ?? 0 };
}

export type OrgConnectionStatus = {
  modes: ("manual" | "paste" | "feed" | "api")[];
  feed: Feed["status"] | null;
  problem: string | null;
};

export async function connectionStatusByOrg(orgIds: string[]): Promise<Map<string, OrgConnectionStatus>> {
  const out = new Map<string, OrgConnectionStatus>();
  if (!orgIds.length) return out;
  const db = await getDb();
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [feeds, keys, runs] = await Promise.all([
    db.from("inventory_feeds").select("org_id, status, status_reason, last_error").in("org_id", orgIds),
    db.from("api_keys").select("org_id").in("org_id", orgIds).is("revoked_at", null),
    db
      .from("inventory_runs")
      .select("org_id, source, status, rows_failed, error, created_at")
      .in("org_id", orgIds)
      .in("status", ["applied", "failed"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  for (const id of orgIds) out.set(id, { modes: ["manual"], feed: null, problem: null });
  for (const f of feeds.data ?? []) {
    const s = out.get(f.org_id)!;
    s.feed = f.status;
    if (f.status === "active") s.modes.push("feed");
    if (f.status === "active" && f.last_error) s.problem = `Feed: ${f.last_error}`;
  }
  for (const k of keys.data ?? []) {
    const s = out.get(k.org_id)!;
    if (!s.modes.includes("api")) s.modes.push("api");
  }
  const seenApi = new Set<string>();
  for (const r of runs.data ?? []) {
    const s = out.get(r.org_id)!;
    if (r.source === "paste" && !s.modes.includes("paste")) s.modes.push("paste");
    if (r.source === "api" && !seenApi.has(r.org_id)) {
      seenApi.add(r.org_id);
      if (!s.problem && r.rows_failed > 0 && Date.parse(r.created_at) > Date.now() - 24 * 3600_000) s.problem = `API: ${r.error}`;
    }
  }
  return out;
}

/** The codes an operator's system needs (format document): vessel slugs, cabin-type codes and schedule codes. */
export async function codesForOrg(orgId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("vessels")
    .select("name, slug, cabin_types(code, name, max_occupancy, active), schedules(code, origin, destination, nights, active)")
    .eq("operator_org_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

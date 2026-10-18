import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";

/** DASH-ADM-074: promotions across the marketplace. */
export default async function AdminPromotions() {
  await requireAdmin(["catalogue"], "/dashboard/admin/promotions/");
  const db = await getDb();
  const { data } = await db
    .from("promotions")
    .select("id, vessel_id, kind, paused, vessel:vessels(name), promotion_translations(locale, benefit)")
    .order("created_at", { ascending: false })
    .limit(300);
  return (
    <>
      <h1 className={ui.pageTitle}>Promotions</h1>
      {data?.length ? (
        <ul className={ui.list}>
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/admin/catalogue/${p.vessel_id}/promotions/${p.id}/`}>
                {p.promotion_translations.find((t) => t.locale === "en")?.benefit ?? p.kind}
              </Link>{" "}
              <span className={ui.muted}>({p.vessel?.name})</span>{" "}
              {p.paused ? <Badge>Paused</Badge> : <Badge tone="success">Active</Badge>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No promotions yet.</p>
      )}
    </>
  );
}

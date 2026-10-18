import Link from "next/link";
import { notFound } from "next/navigation";
import { ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { vesselsOfOrg } from "@/server/product/queries";
import { isUuid } from "../../../sections";

/** DASH-OPR-008: choose a vessel. */
export default async function Picker({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "operator", returnTo: `/dashboard/operator/${orgId}/cabins/` });
  const vessels = await vesselsOfOrg(orgId);
  return (
    <>
      <h1 className={ui.pageTitle}>Cabins and decks</h1>
      {vessels.length ? (
        <ul className={ui.list}>
          {vessels.map((v) => (
            <li key={v.id}>
              <Link href={`/dashboard/operator/${orgId}/cabins/${v.id}/`}>{v.name}</Link>{" "}
              <span className={ui.muted}>
                ({v.summary?.cabin_types ?? 0} cabin types · {v.summary?.schedules ?? 0} schedules ·{" "}
                {v.summary?.bookable_departures ?? 0} bookable departures)
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No vessels are connected to your company yet.</p>
      )}
    </>
  );
}

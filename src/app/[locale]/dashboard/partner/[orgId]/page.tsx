import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../sections";

const ROLE_WORDS = {
  owner: "As the owner you can do everything: search, book, pay and manage the team.",
  reservations: "You can search departures at your company's rates, reserve cabins for clients and send requests.",
  finance: "You can see your company's bookings and pay for them.",
  viewer: "",
} as const;

/** The travel partner's Overview (DASH-B2B-001–011): what this person can do, and where to start. */
export default async function PartnerOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "partner",
    allowPending: true,
    returnTo: `/dashboard/partner/${orgId}/`,
  });
  if (company.status !== "approved" && company.status !== "paused") return null; // the layout shows the status instead
  const db = await getDb();
  const { count: team } = await db.from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", orgId);
  const base = `/dashboard/partner/${orgId}/`;
  const searches = company.status === "approved" && (company.teamRole === "owner" || company.teamRole === "reservations");
  return (
    <>
      <h1 className={ui.pageTitle}>Overview</h1>
      <p>{ROLE_WORDS[company.teamRole]}</p>
      <Section title="Start here" id="start">
        <ul className={ui.list}>
          {searches ? (
            <li>
              <Link href={`${base}search/`}>Search departures</Link>: your company rate, the trade rate, or the public rate where
              neither is set.
            </li>
          ) : null}
          {company.teamRole === "owner" ? (
            <li>
              <Link href={`${base}team/`}>Team</Link>: {team ?? 0} {team === 1 ? "person" : "people"}. Invite your reservations
              and finance colleagues.
            </li>
          ) : null}
        </ul>
      </Section>
    </>
  );
}

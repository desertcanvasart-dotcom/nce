import { notFound } from "next/navigation";
import { TeamPage } from "../../../_team/TeamPage";
import { isUuid } from "../../../sections";

export default async function PartnerTeam({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  return <TeamPage kind="partner" orgId={orgId} />;
}

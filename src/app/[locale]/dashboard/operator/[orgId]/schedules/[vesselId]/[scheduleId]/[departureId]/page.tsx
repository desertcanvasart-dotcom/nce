import { notFound } from "next/navigation";
import { DeparturePage } from "@/app/[locale]/dashboard/_product/SchedulePage";
import { isUuid } from "../../../../../../sections";

export default async function Page({
  params,
}: {
  params: Promise<{ orgId: string; vesselId: string; scheduleId: string; departureId: string }>;
}) {
  const { orgId, vesselId, scheduleId, departureId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId) || !isUuid(scheduleId) || !isUuid(departureId)) notFound();

  return <DeparturePage orgId={orgId} vesselId={vesselId} scheduleId={scheduleId} departureId={departureId} />;
}

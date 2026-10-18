import { notFound } from "next/navigation";
import { DeparturePage } from "@/app/[locale]/dashboard/_product/SchedulePage";
import { isUuid } from "../../../../../../sections";

export default async function Page({ params }: { params: Promise<{ id: string; scheduleId: string; departureId: string }> }) {
  const { id, scheduleId, departureId } = await params;
  if (!isUuid(id) || !isUuid(scheduleId) || !isUuid(departureId)) notFound();

  return <DeparturePage orgId={null} vesselId={id} scheduleId={scheduleId} departureId={departureId} />;
}

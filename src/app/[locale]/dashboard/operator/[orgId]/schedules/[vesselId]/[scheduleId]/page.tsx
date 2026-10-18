import { notFound } from "next/navigation";
import { SchedulePage } from "@/app/[locale]/dashboard/_product/SchedulePage";
import { isUuid } from "../../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; vesselId: string; scheduleId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgId, vesselId, scheduleId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId) || !isUuid(scheduleId)) notFound();
  const sp = await searchParams;
  return <SchedulePage orgId={orgId} vesselId={vesselId} scheduleId={scheduleId} from={sp.from} />;
}

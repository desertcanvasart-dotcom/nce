import { notFound } from "next/navigation";
import { SchedulePage } from "@/app/[locale]/dashboard/_product/SchedulePage";
import { isUuid } from "../../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; scheduleId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id, scheduleId } = await params;
  if (!isUuid(id) || !isUuid(scheduleId)) notFound();
  const sp = await searchParams;
  return <SchedulePage orgId={null} vesselId={id} scheduleId={scheduleId} from={sp.from} />;
}

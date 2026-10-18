import { notFound } from "next/navigation";
import { SchedulesPage } from "@/app/[locale]/dashboard/_product/SchedulesPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ orgId: string; vesselId: string }> }) {
  const { orgId, vesselId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId)) notFound();

  return <SchedulesPage orgId={orgId} vesselId={vesselId} />;
}

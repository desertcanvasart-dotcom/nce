import { notFound } from "next/navigation";
import { SchedulesPage } from "@/app/[locale]/dashboard/_product/SchedulesPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return <SchedulesPage orgId={null} vesselId={id} />;
}

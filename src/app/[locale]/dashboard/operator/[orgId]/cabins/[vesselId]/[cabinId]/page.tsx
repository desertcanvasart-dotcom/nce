import { notFound } from "next/navigation";
import { CabinPage } from "@/app/[locale]/dashboard/_product/CabinPage";
import { isUuid } from "../../../../../sections";

export default async function Page({ params }: { params: Promise<{ orgId: string; vesselId: string; cabinId: string }> }) {
  const { orgId, vesselId, cabinId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId) || !isUuid(cabinId)) notFound();

  return <CabinPage orgId={orgId} vesselId={vesselId} cabinId={cabinId} />;
}

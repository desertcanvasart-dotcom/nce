import { notFound } from "next/navigation";
import { CabinPage } from "@/app/[locale]/dashboard/_product/CabinPage";
import { isUuid } from "../../../../../sections";

export default async function Page({ params }: { params: Promise<{ id: string; cabinId: string }> }) {
  const { id, cabinId } = await params;
  if (!isUuid(id) || !isUuid(cabinId)) notFound();

  return <CabinPage orgId={null} vesselId={id} cabinId={cabinId} />;
}

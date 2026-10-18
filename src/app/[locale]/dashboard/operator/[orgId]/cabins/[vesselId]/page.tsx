import { notFound } from "next/navigation";
import { CabinsPage } from "@/app/[locale]/dashboard/_product/CabinsPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ orgId: string; vesselId: string }> }) {
  const { orgId, vesselId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId)) notFound();

  return <CabinsPage orgId={orgId} vesselId={vesselId} />;
}

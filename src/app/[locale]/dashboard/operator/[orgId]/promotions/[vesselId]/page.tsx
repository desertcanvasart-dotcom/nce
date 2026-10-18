import { notFound } from "next/navigation";
import { PromotionsPage } from "@/app/[locale]/dashboard/_product/PromotionsPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ orgId: string; vesselId: string }> }) {
  const { orgId, vesselId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId)) notFound();

  return <PromotionsPage orgId={orgId} vesselId={vesselId} />;
}

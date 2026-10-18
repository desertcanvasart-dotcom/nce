import { notFound } from "next/navigation";
import { PromotionPage } from "@/app/[locale]/dashboard/_product/PromotionsPage";
import { isUuid } from "../../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; vesselId: string; promoId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgId, vesselId, promoId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId) || !isUuid(promoId)) notFound();
  const sp = await searchParams;
  return <PromotionPage orgId={orgId} vesselId={vesselId} promoId={promoId} linked={sp.linked} skipped={sp.skipped} />;
}

import { notFound } from "next/navigation";
import { PromotionPage } from "@/app/[locale]/dashboard/_product/PromotionsPage";
import { isUuid } from "../../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; promoId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id, promoId } = await params;
  if (!isUuid(id) || !isUuid(promoId)) notFound();
  const sp = await searchParams;
  return <PromotionPage orgId={null} vesselId={id} promoId={promoId} linked={sp.linked} skipped={sp.skipped} />;
}

import { notFound } from "next/navigation";
import { PromotionsPage } from "@/app/[locale]/dashboard/_product/PromotionsPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return <PromotionsPage orgId={null} vesselId={id} />;
}

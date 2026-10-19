import { notFound } from "next/navigation";
import { CabinsPage } from "@/app/[locale]/dashboard/_product/CabinsPage";
import { isUuid } from "../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; vesselId: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  const { orgId, vesselId } = await params;
  if (!isUuid(orgId) || !isUuid(vesselId)) notFound();

  return <CabinsPage orgId={orgId} vesselId={vesselId} preset={preset} />;
}

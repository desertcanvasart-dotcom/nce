import { notFound } from "next/navigation";
import { CabinsPage } from "@/app/[locale]/dashboard/_product/CabinsPage";
import { isUuid } from "../../../../sections";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return <CabinsPage orgId={null} vesselId={id} preset={preset} />;
}

import { notFound } from "next/navigation";
import { CabinsPage } from "@/app/[locale]/dashboard/_product/CabinsPage";
import { isUuid } from "../../../../sections";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return <CabinsPage orgId={null} vesselId={id} />;
}

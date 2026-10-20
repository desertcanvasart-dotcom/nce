import type { Metadata } from "next";
import { SiloPage, siloMetadata, siloStaticParams, type SiloParams } from "../../_silo/silo";

type Props = { params: Promise<SiloParams> };
const PREFIX = "/nile-cruise-guide/";

// Static, refreshed when content is published or the catalogue changes, or every ten minutes (PERF-010).
export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return siloStaticParams(PREFIX);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return siloMetadata(PREFIX, await params);
}

/** Batch 6: the education silo at nile-cruise-guide (pages, components and links from the silo workbook). */
export default async function Silo({ params }: Props) {
  return <SiloPage prefix={PREFIX} params={await params} />;
}

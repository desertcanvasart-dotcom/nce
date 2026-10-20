import type { Metadata } from "next";
import { BUILT } from "@/lib/seo/links";
import { SiloPage, siloMetadata, siloStaticParams, TourPage, tourMetadata, type SiloParams } from "../../_silo/silo";

type Props = { params: Promise<SiloParams> };
const PREFIX = "/tours-extras/";
const urlOf = (path?: string[]) => `${PREFIX}${path?.length ? `${path.join("/")}/` : ""}`;

// Static, refreshed with the content and the catalogue (PERF-010). Tours without a workbook row render on first visit.
export const revalidate = 600;

export function generateStaticParams() {
  return siloStaticParams(PREFIX);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return BUILT.has(urlOf(p.path)) ? siloMetadata(PREFIX, p) : tourMetadata(p);
}

/** PAGE-093–099 and every other published tour (DASH-PUB-006, DASH-ADM-072). */
export default async function ToursExtras({ params }: Props) {
  const p = await params;
  return BUILT.has(urlOf(p.path)) ? <SiloPage prefix={PREFIX} params={p} /> : <TourPage params={p} />;
}

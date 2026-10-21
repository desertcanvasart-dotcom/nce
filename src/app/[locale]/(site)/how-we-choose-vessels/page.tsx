import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { SiloPage, siloMetadata } from "../_silo/silo";

type Props = { params: Promise<{ locale: Locale }> };
const URL = "/how-we-choose-vessels/";

export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return siloMetadata(URL, await params);
}

/** Batch 7-1: a trust and company page (PAGE-101, 102, 106). */
export default async function TrustPage({ params }: Props) {
  return <SiloPage prefix={URL} params={await params} />;
}

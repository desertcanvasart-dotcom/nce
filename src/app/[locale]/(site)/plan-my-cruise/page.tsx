import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { SiloPage, siloMetadata } from "../_silo/silo";

type Props = { params: Promise<{ locale: Locale }> };
const URL = "/plan-my-cruise/";

export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return siloMetadata(URL, await params);
}

/** Batch 8-2a: plan a cruise without an account (PAGE-105, DASH-PUB-007). */
export default async function PlanMyCruise({ params }: Props) {
  return <SiloPage prefix={URL} params={await params} />;
}

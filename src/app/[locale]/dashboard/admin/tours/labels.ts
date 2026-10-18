import { TOUR_KINDS } from "@/lib/tours/tours";

export const READINESS_BADGE = {
  draft: { tone: "neutral", text: "Private draft" },
  information: { tone: "accent", text: "Published: information only" },
  bookable: { tone: "success", text: "Published: bookable" },
} as const;
export const KIND = Object.fromEntries(TOUR_KINDS.map((k) => [k.value, k.label])) as Record<string, string>;
export const SOLD_AS = [
  { value: "shared:per_guest", label: "Shared, per guest" },
  { value: "private:per_guest", label: "Private, per guest" },
  { value: "private:per_group", label: "Private, per group" },
] as const;

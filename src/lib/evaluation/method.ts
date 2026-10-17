/**
 * Evaluation method version 1 (ADR-070), from Faris's `nilecrz` methodology. The database calculates the
 * stored results (app.evaluation_results); this mirror powers the editor's live preview, and tests check
 * both give the same numbers.
 */
export type DimensionKey = "hygiene" | "service" | "food" | "amenities" | "management" | "cabin_vessel" | "cruise_experience";
export type Scores = Record<DimensionKey, [number, number, number, number]>;

export const METHOD_VERSION = 1 as const;

export const DIMENSIONS: { key: DimensionKey; label: string; weight: number; criteria: [string, string, string, string] }[] = [
  {
    key: "hygiene",
    label: "Hygiene",
    weight: 15,
    criteria: ["Cabin and public-area cleanliness", "Bathroom hygiene", "Linen and towel care", "Food-handling hygiene"],
  },
  {
    key: "service",
    label: "Service",
    weight: 20,
    criteria: [
      "Staff warmth and professionalism",
      "Responsiveness to requests",
      "Housekeeping service",
      "Restaurant and concierge service",
    ],
  },
  {
    key: "food",
    label: "Food",
    weight: 15,
    criteria: ["Ingredient quality and freshness", "Menu variety", "Preparation and presentation", "Dietary accommodation"],
  },
  {
    key: "amenities",
    label: "Amenities",
    weight: 10,
    criteria: [
      "Sundeck and pool facilities",
      "Lounge and recreation",
      "Wi-Fi and practical connectivity",
      "Accessibility and practical facilities",
    ],
  },
  {
    key: "management",
    label: "Management",
    weight: 10,
    criteria: [
      "Organisation and communication",
      "Maintenance response",
      "Consistency of standards",
      "Professional problem resolution",
    ],
  },
  {
    key: "cabin_vessel",
    label: "Cabin and vessel",
    weight: 20,
    criteria: [
      "Cabin space, bed and storage",
      "Bathroom and air-conditioning condition",
      "Noise, vibration and sleep comfort",
      "Vessel condition and upkeep",
    ],
  },
  {
    key: "cruise_experience",
    label: "Cruise experience",
    weight: 10,
    criteria: [
      "Sailing time and itinerary execution",
      "Docking and shore access",
      "Passenger density and shared-space comfort",
      "Atmosphere and onboard pacing",
    ],
  },
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function validScores(input: unknown): input is Scores {
  if (!input || typeof input !== "object") return false;
  const keys = Object.keys(input);
  if (keys.length !== DIMENSIONS.length) return false;
  return DIMENSIONS.every((d) => {
    const v = (input as Record<string, unknown>)[d.key];
    return Array.isArray(v) && v.length === 4 && v.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 5);
  });
}

/** Dimension result = (sum of four 0–5 scores ÷ 20) × weight; overall = sum, out of 100. */
export function evaluate(scores: Scores): { dimensions: Record<DimensionKey, number>; overall: number } {
  if (!validScores(scores)) throw new Error("Each dimension needs four scores from 0 to 5.");
  const dimensions = {} as Record<DimensionKey, number>;
  for (const d of DIMENSIONS) {
    dimensions[d.key] = round2((scores[d.key].reduce((a, b) => a + b, 0) / 20) * d.weight);
  }
  const overall = round2(Object.values(dimensions).reduce((a, b) => a + b, 0));
  return { dimensions, overall };
}

export const VERDICTS = [
  { value: "recommended", label: "Recommended" },
  { value: "recommended_with_reservations", label: "Recommended with reservations" },
  { value: "not_recommended", label: "Not recommended" },
] as const;
export type Verdict = (typeof VERDICTS)[number]["value"];

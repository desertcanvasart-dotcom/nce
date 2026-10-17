/** Shared design-system types (vendor/design-system/components/index.d.ts, adjusted per DECISIONS). */

/** Cruise vessel types. The felucca is not a cruise vessel and has no variant (ADR-008, ADR-015). */
export type VesselType = "sail" | "motor" | "steam";
export type SceneTime = "dawn" | "day" | "dusk" | "night";

/** Money in minor units with an ISO currency code (CLAUDE.md §6, DATA-001). */
export type Money = { amount: number; currency: string };

export const vesselIcon: Record<VesselType, "sail" | "engine" | "steam"> = { sail: "sail", motor: "engine", steam: "steam" };

/** Shared design-system types (vendor/design-system/components/index.d.ts, adjusted per DECISIONS). */

/** Cruise vessel types. The felucca is not a cruise vessel and has no variant (ADR-008, ADR-015). */
export type VesselType = "sail" | "motor" | "steam";
export type SceneTime = "dawn" | "day" | "dusk" | "night";

/** Money in minor units with an ISO currency code (CLAUDE.md §6, DATA-001). */
export type Money = { amount: number; currency: string };

export const vesselIcon: Record<VesselType, "sail" | "engine" | "steam"> = { sail: "sail", motor: "engine", steam: "steam" };

/**
 * What drives a vessel (Islam's brief, 4 Nov 2026): an engine, sails only, or a steam paddle wheel. Set in each
 * vessel's data, never inferred from its name; shown everywhere as an icon and a word, never by colour alone.
 */
export type Propulsion = "motor" | "wind" | "steam";
export const PROPULSIONS: Propulsion[] = ["motor", "wind", "steam"];
export const propulsionIcon: Record<Propulsion, "engine" | "sail" | "steam"> = { motor: "engine", wind: "sail", steam: "steam" };
/** The drawing that stands for it on the route: a ship, a sail or a paddle steamer. */
export const propulsionArt: Record<Propulsion, VesselType> = { motor: "motor", wind: "sail", steam: "steam" };

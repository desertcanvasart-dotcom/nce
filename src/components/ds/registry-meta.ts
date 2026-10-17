/**
 * Plain data about the gallery (no component imports), for Playwright specs that cannot load React modules.
 * Kept identical to registry.ts by tests/unit/registry.test.ts.
 */
export type EntryMeta = { name: string; group: string; ds: boolean; stories: number; parity: boolean };

export const registryMeta: EntryMeta[] = [
  { name: "VesselTypeCard", group: "Education", ds: true, stories: 1, parity: true },
  { name: "VesselCompare", group: "Education", ds: true, stories: 1, parity: true },
  { name: "PriceAnatomy", group: "Education", ds: true, stories: 1, parity: true },
  { name: "AmenityGrid", group: "Education", ds: true, stories: 2, parity: true },
  { name: "CruiseCard", group: "Discovery", ds: true, stories: 1, parity: true },
  { name: "ExperienceCard", group: "Discovery", ds: true, stories: 1, parity: true },
  { name: "ItineraryTimeline", group: "Discovery", ds: true, stories: 2, parity: true },
  { name: "Gallery", group: "Discovery", ds: true, stories: 1, parity: true },
  { name: "CruiseSearch", group: "Booking", ds: true, stories: 2, parity: true },
  { name: "CabinPicker", group: "Booking", ds: true, stories: 2, parity: true },
  { name: "BookingSummary", group: "Booking", ds: true, stories: 2, parity: true },
  { name: "NavBar", group: "Frame", ds: true, stories: 1, parity: true },
  { name: "Hero", group: "Frame", ds: true, stories: 1, parity: true },
  { name: "SectionHeading", group: "Frame", ds: true, stories: 2, parity: true },
  { name: "Scene", group: "Frame", ds: true, stories: 1, parity: true },
  { name: "VesselArt", group: "Frame", ds: true, stories: 1, parity: true },
  { name: "Button", group: "Primitives", ds: true, stories: 3, parity: true },
  { name: "Badge", group: "Primitives", ds: true, stories: 2, parity: true },
  { name: "Rating", group: "Primitives", ds: true, stories: 1, parity: true },
  { name: "Stepper", group: "Primitives", ds: true, stories: 2, parity: true },
  { name: "TextField", group: "Primitives", ds: true, stories: 2, parity: true },
  { name: "Icon", group: "Primitives", ds: true, stories: 2, parity: true },
  { name: "StateView", group: "Patterns", ds: false, stories: 4, parity: false },
];

export const slug = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

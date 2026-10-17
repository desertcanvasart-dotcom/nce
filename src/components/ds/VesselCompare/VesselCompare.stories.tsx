import type { Story } from "../lib/story";
import { sampleProfiles } from "../__samples__/samples";
import { VesselCompare } from "./VesselCompare";

export const stories: Story[] = [
  { name: "One at a time, or all three", sample: true, parity: true, render: () => <VesselCompare profiles={sampleProfiles} /> },
];

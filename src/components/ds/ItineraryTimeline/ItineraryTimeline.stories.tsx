import type { Story } from "../lib/story";
import { sampleStops } from "../__samples__/samples";
import { ItineraryTimeline } from "./ItineraryTimeline";

export const stories: Story[] = [
  {
    name: "Six days by dahabiya",
    sample: true,
    parity: true,
    render: () => <ItineraryTimeline stops={sampleStops} vessel="sail" />,
  },
  {
    name: "Three days by motor ship",
    sample: true,
    render: () => <ItineraryTimeline stops={sampleStops.slice(0, 3)} vessel="motor" />,
  },
];

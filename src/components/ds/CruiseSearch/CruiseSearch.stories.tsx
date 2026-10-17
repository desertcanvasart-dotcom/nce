import type { Story } from "../lib/story";
import { sampleRoutes, sampleVessels } from "../__samples__/samples";
import { CruiseSearch } from "./CruiseSearch";

export const stories: Story[] = [
  {
    name: "On the page",
    sample: true,
    parity: true,
    render: () => (
      <div style={{ paddingBottom: 380 }}>
        <CruiseSearch routes={sampleRoutes} vessels={sampleVessels} action="/cruises/" matchCount={12} />
      </div>
    ),
  },
  {
    name: "Over media",
    sample: true,
    onMedia: true,
    render: () => (
      <div style={{ paddingBottom: 380 }}>
        <CruiseSearch onMedia routes={sampleRoutes} vessels={sampleVessels} defaultVessel={1} action="/cruises/" />
      </div>
    ),
  },
];

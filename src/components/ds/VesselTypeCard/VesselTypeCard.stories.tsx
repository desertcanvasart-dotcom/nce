import type { Story } from "../lib/story";
import { sampleProfiles } from "../__samples__/samples";
import { VesselTypeCard } from "./VesselTypeCard";
import layout from "../lib/stories.module.css";

export const stories: Story[] = [
  {
    name: "The three ways to sail",
    sample: true,
    parity: true,
    render: () => (
      <div className={layout.grid3}>
        {[sampleProfiles[1]!, sampleProfiles[0]!, sampleProfiles[2]!].map((p) => (
          <VesselTypeCard
            key={p.type}
            type={p.type}
            title={p.name}
            eyebrow={p.short}
            description={p.line}
            facts={p.facts}
            href={`/vessels/`}
            sample
          />
        ))}
      </div>
    ),
  },
];

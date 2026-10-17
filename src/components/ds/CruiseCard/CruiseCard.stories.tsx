import type { Story } from "../lib/story";
import { sampleCards } from "../__samples__/samples";
import { CruiseCard } from "./CruiseCard";
import layout from "../lib/stories.module.css";

export const stories: Story[] = [
  {
    name: "Score, verified rating, information-only",
    sample: true,
    parity: true,
    render: () => (
      <div className={layout.grid3}>
        {sampleCards.map((c) => (
          <CruiseCard key={c.name} {...c} amenities={[...c.amenities]} />
        ))}
      </div>
    ),
  },
];

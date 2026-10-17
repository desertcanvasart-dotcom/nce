import type { Story } from "../lib/story";
import { SectionHeading } from "./SectionHeading";

export const stories: Story[] = [
  {
    name: "Centred with eyebrow and intro",
    parity: true,
    render: () => (
      <SectionHeading
        eyebrow="Why prices differ"
        title="Same five stars, ten times the price"
        intro="A cabin on the Nile can cost US$800 or US$8,000, and both ships may carry the same licence. Here is where the difference goes."
      />
    ),
  },
  { name: "Left-aligned, no ornament", render: () => <SectionHeading align="left" ornament={false} title="Keep reading" /> },
];

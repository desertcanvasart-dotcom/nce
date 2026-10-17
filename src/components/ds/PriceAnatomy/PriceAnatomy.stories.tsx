import type { Story } from "../lib/story";
import { sampleFactors, samplePresets } from "../__samples__/samples";
import { PriceAnatomy } from "./PriceAnatomy";

export const stories: Story[] = [
  {
    name: "The US$800 and US$8,000 five-star",
    sample: true,
    parity: true,
    render: () => (
      <PriceAnatomy
        factors={sampleFactors}
        currency="USD"
        presets={samplePresets}
        eyebrow="Both are licensed five-star"
        totalLabel="per person, 4–5 nights"
        note="A five-star licence confirms that the facilities exist. It does not measure how many people share them, who guides you or where you moor."
        footnote="Illustrative figures for a Luxor–Aswan sailing in high season. Live prices come from each vessel's rate sheet."
        sample
      />
    ),
  },
];

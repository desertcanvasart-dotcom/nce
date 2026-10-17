import type { Story } from "../lib/story";
import { sampleAmenities } from "../__samples__/samples";
import { AmenityGrid } from "./AmenityGrid";

export const stories: Story[] = [
  { name: "Included, on request, not aboard", sample: true, parity: true, render: () => <AmenityGrid items={sampleAmenities} /> },
  {
    name: "Without filters, four columns",
    sample: true,
    render: () => <AmenityGrid items={sampleAmenities.slice(0, 8)} filters={false} columns={4} />,
  },
];

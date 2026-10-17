import type { Story } from "../lib/story";
import { sampleCabins } from "../__samples__/samples";
import { CabinPicker } from "./CabinPicker";

export const stories: Story[] = [
  {
    name: "Signed in: prices, scarcity, sold out",
    sample: true,
    parity: true,
    render: () => (
      <div style={{ maxWidth: 640 }}>
        <CabinPicker cabins={sampleCabins} defaultValue="junior" name="cabin" />
      </div>
    ),
  },
  {
    name: "Signed out: facts only (ADR-025)",
    sample: true,
    render: () => (
      <div style={{ maxWidth: 640 }}>
        <CabinPicker cabins={sampleCabins} showPrices={false} name="cabin-public" />
      </div>
    ),
  },
];

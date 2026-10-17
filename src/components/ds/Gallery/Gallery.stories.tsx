import type { Story } from "../lib/story";
import { sampleGallery } from "../__samples__/samples";
import { Gallery } from "./Gallery";

export const stories: Story[] = [
  {
    name: "Captured moments",
    sample: true,
    parity: true,
    render: () => <Gallery label="Captured moments" items={sampleGallery} />,
  },
];

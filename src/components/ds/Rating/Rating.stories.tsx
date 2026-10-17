import type { Story } from "../lib/story";
import { Rating } from "./Rating";

export const stories: Story[] = [
  {
    name: "Verified reviews only",
    sample: true,
    parity: true,
    render: () => (
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <Rating value={4.9} count={212} />
        <Rating value={4.4} count={38} />
        <Rating value={3.6} count={1} />
      </div>
    ),
  },
];

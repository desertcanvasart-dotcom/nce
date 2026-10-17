import type { Story } from "../lib/story";
import { Stepper } from "./Stepper";

export const stories: Story[] = [
  {
    name: "Adults and children",
    parity: true,
    render: () => (
      <div style={{ display: "flex", gap: 48 }}>
        <Stepper label="adults" min={1} max={8} defaultValue={2} />
        <Stepper label="children" min={0} max={4} />
      </div>
    ),
  },
  { name: "At the limit (minus disabled)", render: () => <Stepper label="guests" min={1} max={4} defaultValue={1} /> },
];

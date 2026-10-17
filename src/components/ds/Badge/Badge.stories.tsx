import type { Story } from "../lib/story";
import { Badge } from "./Badge";

export const stories: Story[] = [
  {
    name: "Tones",
    parity: true,
    render: () => (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Badge>Dahabiya</Badge>
        <Badge tone="accent">Only 2 suites left</Badge>
        <Badge tone="success" icon="check">
          Confirmed
        </Badge>
        <Badge tone="danger" icon="close">
          Sold out
        </Badge>
      </div>
    ),
  },
  { name: "On media", onMedia: true, render: () => <Badge tone="media">Sailing dahabiya</Badge> },
];

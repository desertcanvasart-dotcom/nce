import type { Story } from "../lib/story";
import { Button } from "./Button";

export const stories: Story[] = [
  {
    name: "Variants",
    parity: true,
    render: () => (
      <div style={{ display: "grid", gap: 24 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary" icon="arrow-right">
            Check availability
          </Button>
          <Button variant="outline">See details</Button>
          <Button variant="ghost">Save for later</Button>
          <Button variant="link" icon="arrow-up-right" href="/cruises/">
            Browse cruises
          </Button>
          <Button variant="outline" disabled>
            Sold out
          </Button>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", background: "var(--nile-800)", padding: 20 }}>
          <Button variant="outline" onMedia>
            Begin your journey
          </Button>
          <Button variant="link" onMedia icon="arrow-up-right" href="/cruises/">
            Browse cruises
          </Button>
        </div>
      </div>
    ),
  },
  {
    name: "Sizes",
    render: () => (
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg" variant="primary">
          Large
        </Button>
      </div>
    ),
  },
  {
    name: "Block (full width), long Spanish label",
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Button variant="primary" block icon="arrow-right">
          Solicitar la reserva de este camarote
        </Button>
      </div>
    ),
  },
];

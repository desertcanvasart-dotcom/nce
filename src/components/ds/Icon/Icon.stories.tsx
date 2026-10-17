import type { Story } from "../lib/story";
import { Icon } from "./Icon";
import { iconNames } from "./icons";

export const stories: Story[] = [
  {
    name: "All 47 icons",
    parity: true,
    render: () => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          borderTop: "1px solid var(--line)",
          borderLeft: "1px solid var(--line)",
        }}
      >
        {iconNames.map((n) => (
          <div
            key={n}
            style={{
              display: "grid",
              justifyItems: "center",
              gap: 8,
              padding: "18px 6px",
              background: "var(--surface-raised)",
              borderRight: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            <span style={{ fontSize: 26, color: "var(--ink)" }}>
              <Icon name={n} />
            </span>
            {n}
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Accent for facts, labelled when alone",
    render: () => (
      <span style={{ color: "var(--accent)", fontSize: 32 }}>
        <Icon name="egyptologist" label="Private Egyptologist" />
      </span>
    ),
  },
];

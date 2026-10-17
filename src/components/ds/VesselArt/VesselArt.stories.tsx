import type { Story } from "../lib/story";
import { VesselArt } from "./VesselArt";
import layout from "../lib/stories.module.css";

export const stories: Story[] = [
  {
    name: "The three cruise vessels (no felucca, ADR-008)",
    parity: true,
    render: () => (
      <div className={layout.grid3} style={{ alignItems: "end" }}>
        {(["motor", "sail", "steam"] as const).map((t) => (
          <figure key={t} style={{ margin: 0, display: "grid", gap: 12 }}>
            <VesselArt type={t} />
            <figcaption style={{ color: "var(--accent)", fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase" }}>
              {t}
            </figcaption>
          </figure>
        ))}
      </div>
    ),
  },
];

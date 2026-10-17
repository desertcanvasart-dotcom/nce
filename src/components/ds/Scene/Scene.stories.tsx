import type { Story } from "../lib/story";
import { Scene } from "./Scene";
import layout from "../lib/stories.module.css";

export const stories: Story[] = [
  {
    name: "Four lights, with parallax",
    parity: true,
    render: () => (
      <div className={layout.grid2}>
        {(
          [
            ["dawn", "sail"],
            ["day", null],
            ["dusk", "motor"],
            ["night", "steam"],
          ] as const
        ).map(([time, vessel]) => (
          <figure key={time} style={{ margin: 0 }}>
            <div style={{ height: 220 }}>
              <Scene time={time} vessel={vessel} parallax label={`${time} scene${vessel ? ` with a ${vessel} vessel` : ""}`} />
            </div>
            <figcaption
              style={{ marginTop: 8, color: "var(--accent)", fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase" }}
            >
              {time}
            </figcaption>
          </figure>
        ))}
      </div>
    ),
  },
];

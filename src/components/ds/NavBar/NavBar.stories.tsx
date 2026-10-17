import type { Story } from "../lib/story";
import { Scene } from "../Scene/Scene";
import { NavBar } from "./NavBar";

const links = [
  { label: "Cruises", href: "/cruises" },
  { label: "Vessels", href: "/vessels" },
  { label: "Why prices differ", href: "/nile-cruise-prices" },
  { label: "Nile cruise guide", href: "/nile-cruise-guide" },
  { label: "Destinations", href: "/destinations" },
  { label: "Tours & extras", href: "/tours-extras" },
];
const cta = { label: "Plan my cruise", href: "/plan-my-cruise" };

export const stories: Story[] = [
  {
    name: "Over media and solid",
    parity: true,
    render: () => (
      <div style={{ display: "grid", gap: 24 }}>
        <div style={{ position: "relative", minHeight: 150, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Scene time="night" vessel={null} />
          </div>
          <NavBar links={links} cta={cta} overMedia />
        </div>
        <NavBar links={links} cta={cta} />
      </div>
    ),
  },
];

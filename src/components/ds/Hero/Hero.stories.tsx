import type { Story } from "../lib/story";
import { Button } from "../Button/Button";
import { CruiseSearch } from "../CruiseSearch/CruiseSearch";
import { NavBar } from "../NavBar/NavBar";
import { sampleRoutes, sampleVessels } from "../__samples__/samples";
import { Hero } from "./Hero";

export const stories: Story[] = [
  {
    name: "Scene, nav and search slot",
    sample: true,
    parity: true,
    render: () => (
      <Hero
        time="dusk"
        vessel="sail"
        eyebrow="Luxor — Aswan"
        title="The Nile, explained before you sail"
        subtitle="Dahabiyas, steamers and floating hotels: what each is really like on board, and why the price of a five-star cabin runs from US$800 to US$8,000."
        action={
          <Button variant="link" onMedia icon="arrow-up-right" href="/cruises/">
            Browse cruises
          </Button>
        }
        nav={
          <NavBar
            overMedia
            links={[
              { label: "Cruises", href: "/cruises" },
              { label: "Why prices differ", href: "/nile-cruise-prices" },
            ]}
            cta={{ label: "Plan my cruise", href: "/plan-my-cruise" }}
          />
        }
      >
        <CruiseSearch onMedia routes={sampleRoutes} vessels={sampleVessels} action="/cruises/" />
      </Hero>
    ),
  },
];

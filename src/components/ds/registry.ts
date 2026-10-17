import type { Story } from "./lib/story";
import { stories as AmenityGrid } from "./AmenityGrid/AmenityGrid.stories";
import { stories as Badge } from "./Badge/Badge.stories";
import { stories as BookingSummary } from "./BookingSummary/BookingSummary.stories";
import { stories as Button } from "./Button/Button.stories";
import { stories as CabinPicker } from "./CabinPicker/CabinPicker.stories";
import { stories as CruiseCard } from "./CruiseCard/CruiseCard.stories";
import { stories as CruiseSearch } from "./CruiseSearch/CruiseSearch.stories";
import { stories as ExperienceCard } from "./ExperienceCard/ExperienceCard.stories";
import { stories as Gallery } from "./Gallery/Gallery.stories";
import { stories as Hero } from "./Hero/Hero.stories";
import { stories as Icon } from "./Icon/Icon.stories";
import { stories as ItineraryTimeline } from "./ItineraryTimeline/ItineraryTimeline.stories";
import { stories as NavBar } from "./NavBar/NavBar.stories";
import { stories as PriceAnatomy } from "./PriceAnatomy/PriceAnatomy.stories";
import { stories as Rating } from "./Rating/Rating.stories";
import { stories as Scene } from "./Scene/Scene.stories";
import { stories as SectionHeading } from "./SectionHeading/SectionHeading.stories";
import { stories as StateView } from "./StateView/StateView.stories";
import { stories as Stepper } from "./Stepper/Stepper.stories";
import { stories as TextField } from "./TextField/TextField.stories";
import { stories as VesselArt } from "./VesselArt/VesselArt.stories";
import { stories as VesselCompare } from "./VesselCompare/VesselCompare.stories";
import { stories as VesselTypeCard } from "./VesselTypeCard/VesselTypeCard.stories";

export type Entry = {
  name: string;
  group: string;
  stories: Story[];
  /** True for the 22 design-system components. */ ds: boolean;
};

/** Every component and its states, for /dev/components (ENG-007). Groups follow the design system's README. */
export const registry: Entry[] = [
  { name: "VesselTypeCard", group: "Education", stories: VesselTypeCard, ds: true },
  { name: "VesselCompare", group: "Education", stories: VesselCompare, ds: true },
  { name: "PriceAnatomy", group: "Education", stories: PriceAnatomy, ds: true },
  { name: "AmenityGrid", group: "Education", stories: AmenityGrid, ds: true },
  { name: "CruiseCard", group: "Discovery", stories: CruiseCard, ds: true },
  { name: "ExperienceCard", group: "Discovery", stories: ExperienceCard, ds: true },
  { name: "ItineraryTimeline", group: "Discovery", stories: ItineraryTimeline, ds: true },
  { name: "Gallery", group: "Discovery", stories: Gallery, ds: true },
  { name: "CruiseSearch", group: "Booking", stories: CruiseSearch, ds: true },
  { name: "CabinPicker", group: "Booking", stories: CabinPicker, ds: true },
  { name: "BookingSummary", group: "Booking", stories: BookingSummary, ds: true },
  { name: "NavBar", group: "Frame", stories: NavBar, ds: true },
  { name: "Hero", group: "Frame", stories: Hero, ds: true },
  { name: "SectionHeading", group: "Frame", stories: SectionHeading, ds: true },
  { name: "Scene", group: "Frame", stories: Scene, ds: true },
  { name: "VesselArt", group: "Frame", stories: VesselArt, ds: true },
  { name: "Button", group: "Primitives", stories: Button, ds: true },
  { name: "Badge", group: "Primitives", stories: Badge, ds: true },
  { name: "Rating", group: "Primitives", stories: Rating, ds: true },
  { name: "Stepper", group: "Primitives", stories: Stepper, ds: true },
  { name: "TextField", group: "Primitives", stories: TextField, ds: true },
  { name: "Icon", group: "Primitives", stories: Icon, ds: true },
  { name: "StateView", group: "Patterns", stories: StateView, ds: false },
];

export const slug = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
export const findEntry = (s: string) => registry.find((e) => slug(e.name) === s);

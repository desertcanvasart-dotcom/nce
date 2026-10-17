import type { Story } from "../lib/story";
import { ExperienceCard } from "./ExperienceCard";
import layout from "../lib/stories.module.css";

export const stories: Story[] = [
  {
    name: "Three in a row",
    sample: true,
    parity: true,
    render: () => (
      <div className={layout.grid3}>
        <ExperienceCard
          title="Dawn at Edfu"
          time="dawn"
          href="/destinations/edfu/"
          description="Reach the Temple of Horus at opening time, an hour before the coaches."
        />
        <ExperienceCard
          title="Lunch under sail"
          time="day"
          vessel="sail"
          temple={false}
          href="/vessels/dahabiya/"
          description="Long tables on the top deck while the crew trims the lateen sails."
        />
        <ExperienceCard
          title="Night at Kom Ombo"
          time="night"
          href="/destinations/kom-ombo/"
          description="The double temple lit from below, seen from your private mooring."
        />
      </div>
    ),
  },
];

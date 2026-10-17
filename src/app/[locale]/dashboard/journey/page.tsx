import { requireUser } from "@/server/auth";
import { Section } from "../sections";

export default async function JourneyHome() {
  await requireUser("/dashboard/journey/");
  return <Section workspace={{ kind: "journey" }} slug="" intro="Your requests, offers, reservations and tours, in one place." />;
}

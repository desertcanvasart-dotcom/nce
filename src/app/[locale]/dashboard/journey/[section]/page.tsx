import { requireUser } from "@/server/auth";
import { Section } from "../../sections";

export default async function JourneySection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  await requireUser(`/dashboard/journey/${section}/`);
  return <Section workspace={{ kind: "journey" }} slug={section} />;
}

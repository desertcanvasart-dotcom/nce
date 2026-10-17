import Link from "next/link";
import { requireUser } from "@/server/auth";
import { Section } from "../sections";

export default async function JourneyHome() {
  const session = await requireUser("/dashboard/journey/");
  const inCompany = session.memberships.some((m) => m.kind === "operator");
  return (
    <>
      <Section workspace={{ kind: "journey" }} slug="" intro="Your requests, offers, reservations and tours, in one place." />
      {inCompany || session.platformRole === "admin" ? null : (
        <p>
          <Link href="/account/apply-operator/">Run a cruise company? Apply as an operator</Link>
        </p>
      )}
    </>
  );
}

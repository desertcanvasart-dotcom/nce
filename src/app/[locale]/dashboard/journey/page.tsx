import Link from "next/link";
import { requireUser } from "@/server/auth";
import { notices } from "@/server/bookings/queries";
import { Notices } from "../_bookings/Notices";
import { Section } from "../sections";
import { markNoticesRead } from "./actions";

export default async function JourneyHome() {
  const session = await requireUser("/dashboard/journey/");
  const inCompany = session.memberships.some((m) => m.kind === "operator");
  const items = await notices({ userId: session.userId });
  return (
    <>
      <Section workspace={{ kind: "journey" }} slug="" intro="Your requests, offers, reservations and tours, in one place." />
      <Notices items={items} markRead={markNoticesRead} />
      {inCompany || session.platformRole === "admin" ? null : (
        <p>
          <Link href="/account/apply-operator/">Run a cruise company? Apply as an operator</Link>
        </p>
      )}
    </>
  );
}

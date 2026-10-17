import { requireAdmin } from "@/server/auth";
import { Section } from "../sections";

export default async function AdminOverview() {
  const session = await requireAdmin(undefined, "/dashboard/admin/");
  return (
    <Section
      workspace={{ kind: "admin", adminRole: session.adminRole }}
      slug=""
      intro="The marketplace control centre: what needs attention across vessels, operators, partners and bookings."
    />
  );
}

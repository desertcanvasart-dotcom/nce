import { requireAdmin } from "@/server/auth";
import { Section } from "../../sections";

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const session = await requireAdmin(undefined, `/dashboard/admin/${section}/`);
  return <Section workspace={{ kind: "admin", adminRole: session.adminRole }} slug={section} />;
}

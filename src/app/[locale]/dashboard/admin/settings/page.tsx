import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { freshnessHours } from "@/server/product/queries";
import { saveFreshness } from "../../_product/actions";

/** ADR-079: how long availability counts as confirmed. Super admins only. */
export default async function SettingsPage() {
  await requireAdmin(["super"], "/dashboard/admin/settings/");
  const h = await freshnessHours();
  return (
    <>
      <h1 className={ui.pageTitle}>Settings</h1>
      <Section title="Availability freshness" id="freshness">
        <p className={ui.muted}>After this time, availability shows as “to be confirmed” and can’t be reserved.</p>
        <ActionForm action={saveFreshness} submit="Save">
          <div className={ui.grid}>
            <Input label="Entered by hand or pasted (hours)" name="manual" inputMode="numeric" required defaultValue={h.manual} />
            <Input label="From a feed or the API (hours)" name="feed" inputMode="numeric" required defaultValue={h.feed} />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}

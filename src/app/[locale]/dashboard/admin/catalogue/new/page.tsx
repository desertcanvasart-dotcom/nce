import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, ui } from "@/components/dashboard/ui";
import { VESSEL_TYPE_LABEL } from "@/lib/catalogue/categories";
import { requireAdmin } from "@/server/auth";
import { createVessel } from "../actions";

/** DASH-ADM-014: a new vessel starts as a private draft; the editor fills in the rest. */
export default async function NewVesselPage() {
  await requireAdmin(["catalogue"], "/dashboard/admin/catalogue/new/");
  return (
    <>
      <h1 className={ui.pageTitle}>Add a vessel</h1>
      <p className={ui.muted}>It starts as a private draft. Nobody outside Nilecruz can see it until it is published.</p>
      <ActionForm action={createVessel} submit="Create draft">
        <Input label="Name" name="name" required maxLength={120} />
        <Select
          label="Type"
          name="type"
          required
          placeholder="Choose a type"
          options={Object.entries(VESSEL_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </ActionForm>
    </>
  );
}

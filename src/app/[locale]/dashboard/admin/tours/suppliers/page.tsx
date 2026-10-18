import Link from "next/link";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, TextArea, ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { suppliers } from "@/server/tours/queries";
import { createSupplier, saveSupplier } from "../actions";

/** DASH-ADM-064: the companies that run Nilecruz tours. Private to admins; suppliers don't sign in. */
export default async function SuppliersPage() {
  const session = await requireAdmin(["catalogue", "content"], "/dashboard/admin/tours/suppliers/");
  const canManage = session.adminRole === "super" || session.adminRole === "catalogue";
  const list = await suppliers();

  const fields = (s?: (typeof list)[number]) => (
    <>
      <div className={ui.grid}>
        <Input label="Company" name="name" required maxLength={160} defaultValue={s?.name} />
        <Input label="Contact" name="contact_name" maxLength={120} defaultValue={s?.contact_name} />
        <Input label="Email" name="email" type="email" maxLength={200} defaultValue={s?.email} />
        <Input label="Phone" name="phone" maxLength={40} defaultValue={s?.phone} />
        <Input label="Licence or registration" name="registration" maxLength={120} defaultValue={s?.registration} />
      </div>
      <TextArea label="Notes" name="notes" rows={3} maxLength={2000} defaultValue={s?.notes} />
    </>
  );

  return (
    <>
      <p>
        <Link href="/dashboard/admin/tours/">← Tours and sightseeing</Link>
      </p>
      <h1 className={ui.pageTitle}>Tour suppliers</h1>
      <p className={ui.muted}>Visible to Nilecruz admins only. Travellers never see these details.</p>
      {list.length ? (
        list.map((s) => (
          <Section key={s.id} title={s.name} id={`supplier-${s.id}`}>
            {canManage ? (
              <ActionForm action={saveSupplier.bind(null, s.id)} submit={`Save ${s.name}`} variant="outline">
                {fields(s)}
              </ActionForm>
            ) : (
              <p>{[s.contact_name, s.email, s.phone, s.registration].filter(Boolean).join(" · ") || "No contact details."}</p>
            )}
          </Section>
        ))
      ) : (
        <p className={ui.muted}>No suppliers yet.</p>
      )}
      {canManage ? (
        <Section title="Add a supplier" id="add">
          <ActionForm action={createSupplier} submit="Add supplier" resetOnSuccess>
            {fields()}
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}

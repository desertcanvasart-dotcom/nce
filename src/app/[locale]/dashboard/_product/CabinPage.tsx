import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, ui } from "@/components/dashboard/ui";
import { requireProductEditor } from "@/server/product/guard";
import { cabinType } from "@/server/product/queries";
import { saveCabin, uploadCabinPhoto } from "./actions";
import { CabinFields } from "./CabinsPage";
import { productPaths } from "./paths";

export async function CabinPage({ orgId, vesselId, cabinId }: { orgId: string | null; vesselId: string; cabinId: string }) {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.cabin(cabinId), { orgId: orgId ?? undefined });
  const c = await cabinType(cabinId, vesselId);
  if (!c) notFound();
  const t = Object.fromEntries(c.cabin_type_translations.map((x) => [x.locale, { name: x.name, description: x.description }]));
  return (
    <>
      <p>
        <Link href={p.cabins}>← Cabins · {vessel.name}</Link>
      </p>
      <h1 className={ui.pageTitle}>
        {c.name} · {c.deck} deck
      </h1>
      <ActionForm action={saveCabin.bind(null, orgId, vesselId, cabinId)} submit="Save cabin type">
        <CabinFields value={{ ...c, size_m2: c.size_m2 === null ? null : Number(c.size_m2), t }} />
      </ActionForm>
      <Section title="Photos" id="photos">
        {c.media.length ? (
          <ul className={ui.thumbs}>
            {c.media.map((m) => (
              <li key={m.id} className={ui.thumb}>
                {m.url ? (
                  <Image
                    src={m.url}
                    alt={m.media_translations.find((x) => x.locale === "en")?.alt ?? ""}
                    width={m.width}
                    height={m.height}
                    sizes="12rem"
                    unoptimized
                  />
                ) : null}
                <span>{m.credit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No photos yet.</p>
        )}
        <ActionForm
          action={uploadCabinPhoto.bind(null, orgId, vesselId, cabinId)}
          submit="Upload photo"
          variant="outline"
          encType="multipart/form-data"
          resetOnSuccess
        >
          <div className={ui.field}>
            <label className={ui.label} htmlFor="photo">
              Photo (JPEG, PNG, WebP or AVIF, up to 15 MB)
            </label>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          </div>
          <Input label="Description for screen readers (English)" name="alt_en" required maxLength={300} />
          <Input label="Credit" name="credit" required maxLength={200} />
          <Checkboxes
            legend="Rights"
            name="rights"
            options={[{ value: "yes", label: "We have the right to publish this photo" }]}
            checked={[]}
          />
        </ActionForm>
      </Section>
    </>
  );
}

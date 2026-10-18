import Link from "next/link";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Section, TextArea, ui } from "@/components/dashboard/ui";
import { formatMoney } from "@/components/ds/lib/format";
import { requireProductEditor } from "@/server/product/guard";
import { cabinTypes } from "@/server/product/queries";
import { saveCabin, saveGratuity } from "./actions";
import { productPaths } from "./paths";

export const DECKS = ["Lower", "Middle", "Upper"];

/** DASH-ADM-048–050, DATA-015, DATA-023: a vessel's cabin types by deck, and its crew gratuity. */
export async function CabinsPage({ orgId, vesselId }: { orgId: string | null; vesselId: string }) {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.cabins, { orgId: orgId ?? undefined });
  const cabins = await cabinTypes(vesselId);
  const decks = [...new Set(cabins.map((c) => c.deck))];
  return (
    <>
      <p>
        <Link href={p.back}>← Back</Link>
      </p>
      <h1 className={ui.pageTitle}>Cabins and decks · {vessel.name}</h1>

      <Section title="Crew gratuity" id="gratuity">
        <p className={ui.muted}>
          Obligatory, per guest aged 3 and over, per night, in US dollars, paid on board at check-out. It is shown separately and
          never added to the booking total.
        </p>
        <ActionForm action={saveGratuity.bind(null, orgId, vesselId)} submit="Save gratuity" variant="outline">
          <Input
            label="US$ per person per night"
            name="gratuity"
            inputMode="decimal"
            required
            defaultValue={vessel.gratuity_usd_minor != null ? (vessel.gratuity_usd_minor / 100).toFixed(2) : ""}
            hint={
              vessel.gratuity_usd_minor != null
                ? `Now ${formatMoney({ amount: vessel.gratuity_usd_minor, currency: "USD" }, "en")}. At least US$5.`
                : "At least US$5."
            }
          />
        </ActionForm>
      </Section>

      <Section title="Cabin types" id="cabins">
        {cabins.length ? (
          decks.map((deck) => (
            <div key={deck}>
              <h3 className={ui.label}>{deck} deck</h3>
              <ul className={ui.list}>
                {cabins
                  .filter((c) => c.deck === deck)
                  .map((c) => (
                    <li key={c.id}>
                      <Link href={p.cabin(c.id)}>{c.name}</Link>{" "}
                      <span className={ui.muted}>
                        ({c.code} · sleeps {c.max_occupancy}
                        {c.size_m2 ? ` · ${c.size_m2} m²` : ""}
                        {c.media.length ? ` · ${c.media.length} photo${c.media.length === 1 ? "" : "s"}` : " · no photo"}
                        {c.active ? "" : " · inactive"})
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        ) : (
          <p className={ui.muted}>No cabin types yet.</p>
        )}
      </Section>

      <Section title="Add a cabin type" id="add">
        <p className={ui.muted}>The same category on two decks is two cabin types, so offers state where the cabin is.</p>
        <ActionForm action={saveCabin.bind(null, orgId, vesselId, null)} submit="Add cabin type">
          <CabinFields />
        </ActionForm>
      </Section>
    </>
  );
}

export function CabinFields({
  value,
}: {
  value?: {
    code: string;
    name: string;
    deck: string;
    size_m2: number | null;
    bed_configuration: string | null;
    max_occupancy: number;
    view: string | null;
    balcony: boolean;
    amenities: string[];
    active: boolean;
    t: Record<string, { name: string | null; description: string | null }>;
  };
}) {
  return (
    <>
      <div className={ui.grid}>
        <Input
          label="Name"
          name="name"
          required
          maxLength={120}
          defaultValue={value?.name}
          hint="For example “Standard double”."
        />
        <Input
          label="Code"
          name="code"
          required
          maxLength={40}
          defaultValue={value?.code}
          hint="Short and unique, used by feeds: STD-M."
        />
        <Input
          label="Deck"
          name="deck"
          required
          maxLength={60}
          defaultValue={value?.deck ?? "Middle"}
          hint="Lower, Middle, Upper or the vessel’s own name."
        />
        <Input
          label="Maximum occupancy"
          name="max_occupancy"
          inputMode="numeric"
          required
          defaultValue={value?.max_occupancy ?? 2}
          hint="1 to 3. Infants under 3 don’t count."
        />
        <Input label="Size (m²)" name="size_m2" inputMode="decimal" defaultValue={value?.size_m2} />
        <Input
          label="Beds"
          name="bed_configuration"
          maxLength={120}
          defaultValue={value?.bed_configuration}
          hint="For example “1 double or 2 singles”."
        />
        <Input label="View" name="view" maxLength={80} defaultValue={value?.view} hint="For example “Panoramic window”." />
        <Input
          label="Amenities"
          name="amenities"
          maxLength={1000}
          defaultValue={value?.amenities.join(", ")}
          hint="Separated by commas."
        />
      </div>
      <Checkboxes
        legend="Options"
        name="balcony"
        options={[{ value: "yes", label: "Private balcony" }]}
        checked={value?.balcony ? ["yes"] : []}
      />
      {value ? (
        <Checkboxes
          legend="Status"
          name="active"
          options={[{ value: "yes", label: "Active (offered)" }]}
          checked={value.active ? ["yes"] : []}
        />
      ) : null}
      <TextArea
        label="Description (English)"
        name="description_en"
        lang="en"
        maxLength={4000}
        defaultValue={value?.t.en?.description}
      />
      <div className={ui.grid}>
        <Input label="Name in Spanish" name="name_es" maxLength={120} defaultValue={value?.t.es?.name} />
        <Input label="Name in Japanese" name="name_ja" maxLength={120} defaultValue={value?.t.ja?.name} />
      </div>
      <TextArea
        label="Description (Spanish)"
        name="description_es"
        lang="es"
        maxLength={4000}
        defaultValue={value?.t.es?.description}
      />
      <TextArea
        label="Description (Japanese)"
        name="description_ja"
        lang="ja"
        maxLength={4000}
        defaultValue={value?.t.ja?.description}
      />
    </>
  );
}

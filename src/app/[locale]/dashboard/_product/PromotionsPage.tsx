import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { RATE_PLANS } from "@/lib/product/pricing";
import { requireProductEditor } from "@/server/product/guard";
import { cabinTypes, promotionsOf } from "@/server/product/queries";
import { getDb } from "@/server/db";
import { savePromotion, setPromotionPaused } from "./actions";
import { productPaths } from "./paths";

const KINDS = [
  { value: "percent", label: "Percentage discount" },
  { value: "fixed", label: "Fixed amount off" },
  { value: "extra", label: "Included extra service" },
  { value: "upgrade", label: "Guaranteed cabin upgrade" },
] as const;

type Promo = Awaited<ReturnType<typeof promotionsOf>>[number];

function describe(p: Promo): string {
  if (p.kind === "percent") return `${Number(p.percent)}% off`;
  if (p.kind === "fixed")
    return `${formatMoney({ amount: Number(p.fixed_amount_minor), currency: p.fixed_currency ?? "USD" }, "en")} off per person`;
  if (p.kind === "upgrade") return `Upgrade to ${p.upgrade?.name ?? "a better cabin"}`;
  return "Included extra";
}

/** DASH-ADM-074–085, DASH-OPR-012: promotions against existing rates and inventory. */
export async function PromotionsPage({ orgId, vesselId }: { orgId: string | null; vesselId: string }) {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.promotions, { orgId: orgId ?? undefined, promotions: true });
  const [list, cabins] = await Promise.all([promotionsOf(vesselId), cabinTypes(vesselId)]);
  return (
    <>
      <p>
        <Link href={p.back}>← Back</Link>
      </p>
      <h1 className={ui.pageTitle}>Promotions and upgrades · {vessel.name}</h1>
      <Section title="Promotions" id="list">
        {list.length ? (
          <ul className={ui.list}>
            {list.map((x) => (
              <li key={x.id}>
                <Link href={p.promotion(x.id)}>
                  {x.promotion_translations.find((t) => t.locale === "en")?.benefit ?? describe(x)}
                </Link>{" "}
                <span className={ui.muted}>
                  ({describe(x)} · {(x.promotion_rates as unknown as { count: number }[])[0]?.count ?? 0} rates)
                </span>{" "}
                {x.paused ? <Badge>Paused</Badge> : <Badge tone="success">Active</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No promotions yet.</p>
        )}
      </Section>
      <Section title="New promotion" id="new">
        <p className={ui.muted}>
          A promotion applies to existing rates and never creates cabins. An upgrade needs available cabins in the better type on
          the same departure. A rate can carry only one promotion.
        </p>
        <ActionForm action={savePromotion.bind(null, orgId, vesselId, null)} submit="Create promotion">
          <PromotionFields cabins={cabins} />
        </ActionForm>
      </Section>
    </>
  );
}

export function PromotionFields({
  cabins,
  value,
}: {
  cabins: { id: string; name: string; deck: string; active: boolean }[];
  value?: Promo & { selectedCabins: string[]; selectedPlans: string[] };
}) {
  const t = (l: string) => value?.promotion_translations.find((x) => x.locale === l);
  return (
    <>
      <div className={ui.grid}>
        <Select label="Type" name="kind" required placeholder="Choose" defaultValue={value?.kind} options={KINDS} />
        <Input
          label="Percentage (for a percentage discount)"
          name="percent"
          inputMode="decimal"
          defaultValue={value?.percent ?? undefined}
        />
        <Input
          label="Amount off per person (for a fixed discount)"
          name="fixed"
          inputMode="decimal"
          defaultValue={value?.fixed_amount_minor ? (Number(value.fixed_amount_minor) / 100).toFixed(2) : undefined}
        />
        <Select
          label="Currency of the fixed amount"
          name="fixed_currency"
          placeholder="—"
          defaultValue={value?.fixed_currency}
          options={[
            { value: "USD", label: "US$" },
            { value: "EUR", label: "€" },
            { value: "EGP", label: "E£" },
          ]}
        />
        <Select
          label="Upgrade to (for an upgrade)"
          name="upgrade_to"
          placeholder="—"
          defaultValue={value?.upgrade_to_cabin_type_id}
          options={cabins.filter((c) => c.active).map((c) => ({ value: c.id, label: `${c.name} (${c.deck})` }))}
        />
      </div>
      <div className={ui.grid}>
        <Input label="Book from" name="booking_from" type="date" defaultValue={value?.booking_from} />
        <Input label="Book until" name="booking_to" type="date" defaultValue={value?.booking_to} />
        <Input label="Departures from" name="departure_from" type="date" defaultValue={value?.departure_from} />
        <Input label="Departures until" name="departure_to" type="date" defaultValue={value?.departure_to} />
      </div>
      <Checkboxes
        legend="For these cabin types"
        name="cabin_types"
        options={cabins.map((c) => ({ value: c.id, label: `${c.name} (${c.deck})` }))}
        checked={value?.selectedCabins ?? []}
      />
      <Checkboxes
        legend="For these rate plans"
        name="rate_plans"
        options={RATE_PLANS}
        checked={value?.selectedPlans ?? ["international"]}
      />
      <Input
        label="Benefit (English)"
        name="benefit_en"
        required
        maxLength={300}
        defaultValue={t("en")?.benefit}
        hint="What the traveller gets, in one line."
      />
      <TextArea label="Terms (English)" name="terms_en" lang="en" maxLength={4000} rows={3} defaultValue={t("en")?.terms} />
      <div className={ui.grid}>
        <Input label="Benefit (Spanish)" name="benefit_es" maxLength={300} defaultValue={t("es")?.benefit} />
        <Input label="Benefit (Japanese)" name="benefit_ja" maxLength={300} defaultValue={t("ja")?.benefit} />
      </div>
      <TextArea label="Terms (Spanish)" name="terms_es" lang="es" maxLength={4000} rows={3} defaultValue={t("es")?.terms} />
      <TextArea label="Terms (Japanese)" name="terms_ja" lang="ja" maxLength={4000} rows={3} defaultValue={t("ja")?.terms} />
    </>
  );
}

export async function PromotionPage({
  orgId,
  vesselId,
  promoId,
  linked,
  skipped,
}: {
  orgId: string | null;
  vesselId: string;
  promoId: string;
  linked?: string;
  skipped?: string;
}) {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.promotion(promoId), { orgId: orgId ?? undefined, promotions: true });
  const [list, cabins] = await Promise.all([promotionsOf(vesselId), cabinTypes(vesselId)]);
  const x = list.find((y) => y.id === promoId);
  if (!x) notFound();
  const db = await getDb();
  const { data: rates } = await db
    .from("promotion_rates")
    .select("rate:rates(cabin_type_id, rate_plan)")
    .eq("promotion_id", promoId);
  const selectedCabins = [...new Set((rates ?? []).map((r) => r.rate?.cabin_type_id).filter((v): v is string => !!v))];
  const selectedPlans = [...new Set((rates ?? []).map((r) => r.rate?.rate_plan).filter((v): v is NonNullable<typeof v> => !!v))];
  return (
    <>
      <p>
        <Link href={p.promotions}>← Promotions</Link>
      </p>
      <h1 className={ui.pageTitle}>{x.promotion_translations.find((t) => t.locale === "en")?.benefit ?? "Promotion"}</h1>
      {linked !== undefined ? (
        <Notice tone="success">
          Created. Applies to {linked} rate{linked === "1" ? "" : "s"}
          {Number(skipped) > 0 ? `; ${skipped} skipped (already in another promotion, or no upgraded inventory)` : ""}.
        </Notice>
      ) : null}
      <p className={ui.actions}>
        {x.paused ? <Badge>Paused</Badge> : <Badge tone="success">Active</Badge>}
        <ActionForm
          action={setPromotionPaused.bind(null, orgId, vesselId, promoId)}
          submit={x.paused ? "Resume" : "Pause"}
          variant="outline"
        >
          <input type="hidden" name="paused" value={x.paused ? "no" : "yes"} />
        </ActionForm>
      </p>
      <ActionForm action={savePromotion.bind(null, orgId, vesselId, promoId)} submit="Save promotion">
        <PromotionFields cabins={cabins} value={{ ...x, selectedCabins, selectedPlans }} />
      </ActionForm>
    </>
  );
}

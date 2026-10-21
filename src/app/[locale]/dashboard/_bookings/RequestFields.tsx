import { Input, Select, TextArea, ui } from "@/components/dashboard/ui";

/** The fields of a cruise request, shared by customers (DASH-CUS-014) and travel partners (DASH-B2B-004). */
export type RequestDefaults = {
  route?: string;
  earliest?: string;
  latest?: string;
  nights?: number;
  nightsMin?: number;
  nightsMax?: number;
  adults?: number;
  childAges?: string;
  cabins?: number;
  budget?: string;
  currency?: string;
  notes?: string;
};

/** `defaults` prefill the form, for example from a vessel page's "Ask for an offer" (Batch 5-2). */
export function RequestFields({
  routes,
  defaults = {},
}: {
  routes: { origin: string; destination: string }[];
  defaults?: RequestDefaults;
}) {
  return (
    <>
      <Select
        label="Route"
        name="route"
        placeholder="Flexible: any route"
        defaultValue={defaults.route}
        options={routes.map((r) => ({ value: `${r.origin}→${r.destination}`, label: `${r.origin} → ${r.destination}` }))}
      />
      <div className={ui.grid}>
        <Input label="Earliest departure" name="earliest_departure" type="date" required defaultValue={defaults.earliest} />
        <Input label="Latest departure" name="latest_departure" type="date" required defaultValue={defaults.latest} />
        <Input label="Back by (optional)" name="latest_finish" type="date" hint="The latest date the cruise may end." />
        <Input
          label="Shortest stay (nights)"
          name="nights_min"
          inputMode="numeric"
          required
          defaultValue={defaults.nightsMin ?? defaults.nights ?? 3}
        />
        <Input
          label="Longest stay (nights)"
          name="nights_max"
          inputMode="numeric"
          required
          defaultValue={defaults.nightsMax ?? defaults.nights ?? 7}
        />
      </div>
      <div className={ui.grid}>
        <Input label="Adults (18 and over)" name="adults" inputMode="numeric" required defaultValue={defaults.adults ?? 2} />
        <Input
          label="Children’s ages"
          name="child_ages"
          maxLength={80}
          defaultValue={defaults.childAges}
          hint="Each child’s age on the travel date, separated by commas, for example “7, 4”. Leave empty if none."
        />
        <Input label="Cabins" name="cabins" inputMode="numeric" required defaultValue={defaults.cabins ?? 1} />
      </div>
      <Input label="Who shares which cabin (optional)" name="cabin_notes" maxLength={500} />
      <div className={ui.grid}>
        <Input label="Budget for everyone (optional)" name="budget" inputMode="decimal" defaultValue={defaults.budget} />
        <Select
          label="Budget currency"
          name="budget_currency"
          defaultValue={defaults.currency ?? "USD"}
          options={[
            { value: "USD", label: "US$" },
            { value: "EUR", label: "€" },
            { value: "EGP", label: "E£" },
          ]}
        />
      </div>
      <TextArea
        label="Anything else operators should know (optional)"
        name="notes"
        rows={3}
        maxLength={2000}
        defaultValue={defaults.notes}
      />
    </>
  );
}

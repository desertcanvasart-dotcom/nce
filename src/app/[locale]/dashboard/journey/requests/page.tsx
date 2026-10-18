import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { requireUser } from "@/server/auth";
import { myRequests, routeOptions } from "@/server/bookings/queries";
import { createRequest } from "../actions";

const STATUS = {
  open: { tone: "success", text: "Open for offers" },
  accepted: { tone: "accent", text: "Offer accepted" },
  closed: { tone: "neutral", text: "Closed" },
} as const;

/** DASH-CUS-004, 014, 015: ask operators for offers and follow each request. */
export default async function MyRequests() {
  await requireUser("/dashboard/journey/requests/");
  const [requests, routes] = await Promise.all([myRequests(), routeOptions()]);

  return (
    <>
      <h1 className={ui.pageTitle}>Cruise requests</h1>
      <Notice>
        A request asks operators for personal offers. Operators whose cruises fit can reply, and you choose. It isn’t an auction:
        no offer and no lowest price is guaranteed.
      </Notice>

      <Section title="Your requests" id="mine">
        {requests.length ? (
          <ul className={ui.list}>
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/journey/requests/${r.id}/`}>
                  {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}, {r.earliest_departure} to{" "}
                  {r.latest_departure}
                </Link>{" "}
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].text}</Badge>{" "}
                <span className={ui.muted}>
                  {r.offers.length} offer{r.offers.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No requests yet.</p>
        )}
      </Section>

      <Section title="Ask for offers" id="new">
        <ActionForm action={createRequest} submit="Send request">
          <Select
            label="Route"
            name="route"
            placeholder="Flexible: any route"
            options={routes.map((r) => ({ value: `${r.origin}→${r.destination}`, label: `${r.origin} → ${r.destination}` }))}
          />
          <div className={ui.grid}>
            <Input label="Earliest departure" name="earliest_departure" type="date" required />
            <Input label="Latest departure" name="latest_departure" type="date" required />
            <Input label="Back by (optional)" name="latest_finish" type="date" hint="The latest date the cruise may end." />
            <Input label="Shortest stay (nights)" name="nights_min" inputMode="numeric" required defaultValue={3} />
            <Input label="Longest stay (nights)" name="nights_max" inputMode="numeric" required defaultValue={7} />
          </div>
          <div className={ui.grid}>
            <Input label="Adults (18 and over)" name="adults" inputMode="numeric" required defaultValue={2} />
            <Input
              label="Children’s ages"
              name="child_ages"
              maxLength={80}
              hint="Each child’s age on the travel date, separated by commas, for example “7, 4”. Leave empty if none."
            />
            <Input label="Cabins" name="cabins" inputMode="numeric" required defaultValue={1} />
          </div>
          <Input label="Who shares which cabin (optional)" name="cabin_notes" maxLength={500} />
          <div className={ui.grid}>
            <Input label="Budget for everyone (optional)" name="budget" inputMode="decimal" />
            <Select
              label="Budget currency"
              name="budget_currency"
              defaultValue="USD"
              options={[
                { value: "USD", label: "US$" },
                { value: "EUR", label: "€" },
                { value: "EGP", label: "E£" },
              ]}
            />
          </div>
          <TextArea label="Anything else operators should know (optional)" name="notes" rows={3} maxLength={2000} />
          <p className={ui.muted}>Operators see your trip and the guests’ ages, not your name or contact details, until you accept an offer.</p>
        </ActionForm>
      </Section>
    </>
  );
}

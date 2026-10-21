import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, ui } from "@/components/dashboard/ui";
import { FORMAT_ID, LIMITS } from "@/lib/connections/format";
import { env } from "@/lib/env";
import { requireOrgRole } from "@/server/auth";
import { serverEnv } from "@/server/env";
import { codesForOrg } from "@/server/connections/queries";
import { isUuid } from "../../../../sections";

/**
 * The Nilecruz inventory format v1, published for operators and their developers (ADR-080, DASH-OPR-024–026).
 * Shown inside the dashboard with the company's own codes, so the examples can be copied as they are.
 */

const JSON_EXAMPLE = `{
  "format": "${FORMAT_ID}",
  "cruises": [
    {
      "id": "your-vessel-slug",
      "availability": [
        {
          "date": "2027-03-15",
          "schedule": "LXR-ASW-4N",
          "cabins": [
            {
              "type": "STD",
              "available": 4,
              "confirmed_at": "2027-03-01T09:30:00+02:00",
              "rates": [
                { "occupancy": 2, "plan": "international", "currency": "USD", "price": "1250.00" },
                { "occupancy": 1, "plan": "international", "currency": "USD", "price": "1875.00" },
                { "occupancy": 2, "plan": "egyptian_citizen", "currency": "EGP", "price": "45000.00" }
              ]
            },
            { "type": "STE", "available": 0 }
          ]
        }
      ]
    }
  ]
}`;

const XML_EXAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed format="${FORMAT_ID}">
  <cruises>
    <cruise>
      <id>your-vessel-slug</id>
      <availability>
        <date date="2027-03-15" schedule="LXR-ASW-4N">
          <cabin type="STD" available="4" confirmed_at="2027-03-01T07:30:00Z">
            <rate occupancy="2" plan="international" currency="USD" price="1250.00"/>
          </cabin>
          <cabin type="STE" available="0"/>
        </date>
      </availability>
    </cruise>
  </cruises>
</feed>`;

const SIGN_EXAMPLE = `// Node.js 18 or later. Any language with Ed25519 signatures works the same way.
import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto";

const keyId = "nck_…";                       // shown next to the key in your dashboard
const privateKey = createPrivateKey(process.env.NILECRUZ_PRIVATE_KEY); // the PEM shown once
const path = "/api/v1/inventory/";
const body = JSON.stringify(inventory);       // the format v1 document
const timestamp = String(Math.floor(Date.now() / 1000));
const idempotencyKey = randomUUID();          // keep it to retry this same request
const bodySha256 = createHash("sha256").update(body).digest("hex");
const text = ["nilecruz-v1", "POST", path, timestamp, idempotencyKey, bodySha256].join("\\n");
const signature = sign(null, Buffer.from(text), privateKey).toString("base64");

const res = await fetch(new URL(path, "${"{SITE}"}"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Nilecruz-Key": keyId,
    "Nilecruz-Timestamp": timestamp,
    "Nilecruz-Signature": signature,
    "Idempotency-Key": idempotencyKey,
  },
  body,
});
console.log(res.status, await res.json());`;

const RESPONSE_EXAMPLE = `{
  "run_id": "…",
  "total": 3, "changed": 1, "unchanged": 1, "skipped": 0, "failed": 1,
  "problems": [
    { "i": 3, "label": "your-vessel-slug · 2027-03-16 · STD", "status": "error",
      "messages": ["Your Vessel has no sailing on 2027-03-16. Departures come from the schedules in your dashboard."] }
  ]
}`;

export default async function FormatDocument({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: `/dashboard/operator/${orgId}/inventory/format/` });
  const codes = await codesForOrg(orgId);
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/inventory/`}>← Inventory connections</Link>
      </p>
      <h1 className={ui.pageTitle}>Nilecruz inventory format v1</h1>
      <p>
        One format for availability and prices, whether you paste it, publish it as a feed or send it to the API. It follows the
        feed format of the earlier Nilecruz marketplace and adds cabin-type codes, occupancy, rate plans and the time each
        availability was confirmed. Format identifier: <code>{FORMAT_ID}</code>.
      </p>

      <Section title="No system? Send us your weekly sheet" id="sheet">
        <p>
          Keep sending the vacancy sheet you already send agents: Excel, CSV, PDF or a photo, by email
          {serverEnv.SHEETS_EMAIL_ADDRESS ? (
            <>
              {" "}
              to <a href={`mailto:${serverEnv.SHEETS_EMAIL_ADDRESS}`}>{serverEnv.SHEETS_EMAIL_ADDRESS}</a>
            </>
          ) : null}
          {serverEnv.WHATSAPP_DISPLAY_NUMBER ? ` or on WhatsApp to ${serverEnv.WHATSAPP_DISPLAY_NUMBER}` : ""}. We read it into
          this format and a Nilecruz admin checks it before your availability changes. Send it from an address or number listed as
          a contact on your Inventory connections page, so we know it’s yours.
        </p>
        <p className={ui.muted}>
          Sheet availability counts as confirmed for 7 days. Customers then send booking requests, which you confirm with one tap
          from the email.
        </p>
      </Section>

      <Section title="Your codes" id="codes">
        <p>Use these exactly. Cabin types and schedules are set up in your dashboard; feeds and the API never create them.</p>
        {codes.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Vessel, cabin and schedule codes</caption>
              <thead>
                <tr>
                  <th scope="col">Vessel</th>
                  <th scope="col">Cruise “id”</th>
                  <th scope="col">Cabin “type” codes</th>
                  <th scope="col">Schedule codes</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((v) => (
                  <tr key={v.slug}>
                    <th scope="row" data-label="Vessel">
                      {v.name}
                    </th>
                    <td data-label="Cruise “id”">
                      <code>{v.slug}</code>
                    </td>
                    <td data-label="Cabin “type” codes">
                      {v.cabin_types.length
                        ? v.cabin_types
                            .map((c) => `${c.code} (${c.name}, up to ${c.max_occupancy}${c.active ? "" : ", switched off"})`)
                            .join(" · ")
                        : "None yet"}
                    </td>
                    <td data-label="Schedule codes">
                      {v.schedules.length
                        ? v.schedules.map((s) => `${s.code} (${s.origin} → ${s.destination}, ${s.nights} nights)`).join(" · ")
                        : "None yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No vessels are connected to your company yet.</p>
        )}
      </Section>

      <Section title="JSON" id="json">
        <pre className={ui.code} aria-label="JSON example">
          {JSON_EXAMPLE}
        </pre>
      </Section>

      <Section title="XML" id="xml">
        <p>
          The same structure. XML with a <code>&lt;!DOCTYPE&gt;</code> or entity declarations is refused, and entity references
          are not expanded.
        </p>
        <pre className={ui.code} aria-label="XML example">
          {XML_EXAMPLE}
        </pre>
      </Section>

      <Section title="Fields" id="fields">
        <dl className={ui.list}>
          <dt>
            <code>cruises[].id</code>
          </dt>
          <dd>The vessel’s Nilecruz slug (see “Your codes”). Other companies’ vessels are refused.</dd>
          <dt>
            <code>availability[].date</code>, <code>schedule</code>
          </dt>
          <dd>
            The departure date (YYYY-MM-DD, Egypt). Add the schedule code when the vessel has more than one sailing that day. The
            sailing must already exist in your schedules, not be cancelled and not have left.
          </dd>
          <dt>
            <code>cabins[].type</code>, <code>available</code>
          </dt>
          <dd>
            The cabin type’s code and the number of cabins of that type left on that sailing (0 to 400). The number is shared by
            every price of the cabin type: prices never add cabins.
          </dd>
          <dt>
            <code>confirmed_at</code> (optional)
          </dt>
          <dd>
            When your system last checked this availability, with a time zone. Without it, the time Nilecruz received the data is
            used. If Nilecruz already has availability confirmed later (for example entered by hand), the row is not applied.
          </dd>
          <dt>
            <code>rates[]</code> (optional)
          </dt>
          <dd>
            Price per person: <code>occupancy</code> 1, 2 or 3 guests (at most what the cabin sleeps), <code>plan</code> one of
            international, egyptian_citizen, foreign_resident or trade, <code>currency</code> USD, EUR or EGP (E£ only for the
            Egyptian-citizen and foreign-resident plans), <code>price</code> with at most two decimals. Rates you don’t send stay
            as they are. Child prices and the crew gratuity are set in your dashboard. <code>package</code> (optional):{" "}
            <code>cruise</code> (the default) or <code>with_sightseeing</code>, a price that includes the vessel’s own
            sightseeing. Only vessels Nilecruz has approved to sell that way can send <code>with_sightseeing</code>; for every
            other vessel Nilecruz sells the sightseeing.
          </dd>
        </dl>
        <p className={ui.muted}>
          Other fields from the earlier format (name, route, amenities, images) are ignored: vessel facts are kept in your vessel
          profile. A cabin “price” without “rates” is ignored with a warning, and its availability is still used.
        </p>
      </Section>

      <Section title="Feeds" id="feeds">
        <p>
          Publish the document at an https:// address on the public internet (port 443 or 8443). After Nilecruz approves the
          address, it is pulled every hour; after three failures in a row, every two hours until it works again. Limits: 5 MB, 20
          seconds, uncompressed, at most three redirects, each to a public https address. Changing the address needs a new
          approval.
        </p>
        <p>
          Use an address that serves only this document. If your system needs a token in the address, make it one that can only
          read inventory: the address is visible to your team and to Nilecruz admins.
        </p>
      </Section>

      <Section title="Signing requests (API)" id="signing">
        <p>
          Send <code>POST {site}/api/v1/inventory/</code> with the document as the body (JSON, or XML with an XML content type),
          up to {LIMITS.apiBytes / 1_000_000} MB, and these headers:
        </p>
        <ul className={ui.list}>
          <li>
            <code>Nilecruz-Key</code>: the key ID.
          </li>
          <li>
            <code>Nilecruz-Timestamp</code>: the time in seconds since 1970 (UTC), within five minutes of our clock.
          </li>
          <li>
            <code>Idempotency-Key</code>: a new value for each new request (8 to 100 letters, numbers or _ . : -). Retrying with
            the same key and body returns the first answer and changes nothing again. Keys are remembered for 24 hours.
          </li>
          <li>
            <code>Nilecruz-Signature</code>: the Ed25519 signature, in base64, of these six lines joined by a line break (\n):
            <code>nilecruz-v1</code>, <code>POST</code>, the path <code>/api/v1/inventory/</code>, the timestamp, the idempotency
            key, and the SHA-256 of the body in lower-case hex.
          </li>
        </ul>
        <pre className={ui.code} aria-label="Signing example in Node.js">
          {SIGN_EXAMPLE.replace("{SITE}", site)}
        </pre>
        <p>
          The answer lists what happened. Status 200 means the request was read; rows with problems are listed and the others
          applied. 401 is a signature problem, 413 too large, 422 a document that can’t be read (or an idempotency key reused for
          a different body), 409 the same request still in progress.
        </p>
        <pre className={ui.code} aria-label="Example answer">
          {RESPONSE_EXAMPLE}
        </pre>
        <p className={ui.muted}>
          Webhooks from Nilecruz to your system arrive with reservations (Batch 4e). They are signed the same way with Nilecruz’s
          own key, which will be published here.
        </p>
      </Section>
    </>
  );
}

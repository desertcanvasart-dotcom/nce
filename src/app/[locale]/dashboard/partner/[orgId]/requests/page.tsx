import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Notice, Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { companyRequests, routeOptions } from "@/server/bookings/queries";
import { guestsText } from "../../../_bookings/OfferSummary";
import { RequestFields } from "../../../_bookings/RequestFields";
import { isUuid } from "../../../sections";
import { partnerCreateRequest } from "../actions";

const STATUS = {
  open: { tone: "success", text: "Open for offers" },
  accepted: { tone: "accent", text: "Offer accepted" },
  closed: { tone: "neutral", text: "Closed" },
} as const;

/** DASH-B2B-004: the company's requests to operators, and a new one. Every owner and reservations user sees them all. */
export default async function CompanyRequests({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "partner", returnTo: `/dashboard/partner/${orgId}/requests/` });
  const [requests, routes] = await Promise.all([companyRequests(orgId), routeOptions()]);
  const base = `/dashboard/partner/${orgId}/requests/`;

  return (
    <>
      <h1 className={ui.pageTitle}>Requests and offers</h1>
      <Notice>
        A request asks operators for offers for your client. Operators see that it comes from a travel partner and may offer at
        the trade rate. Anyone in your company who books can compare the offers and accept one.
      </Notice>

      <Section title="Company requests" id="mine">
        {requests.length ? (
          <ul className={ui.list}>
            {requests.map((r) => {
              const open = r.offers.filter((o) => o.status === "sent").length;
              return (
                <li key={r.id}>
                  <Link href={`${base}${r.id}/`}>
                    {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}, {r.earliest_departure} to{" "}
                    {r.latest_departure}
                  </Link>{" "}
                  <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].text}</Badge>{" "}
                  <span className={ui.muted}>
                    {guestsText(r.adults, r.child_ages)} · {open} current offer{open === 1 ? "" : "s"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={ui.muted}>No requests yet.</p>
        )}
      </Section>

      <Section title="Ask operators for offers" id="new">
        <ActionForm action={partnerCreateRequest.bind(null, orgId)} submit="Send request">
          <RequestFields routes={routes} />
          <p className={ui.muted}>
            Operators see your company’s trip and the guests’ ages. Your client’s name and your selling price are never shared.
          </p>
        </ActionForm>
      </Section>
    </>
  );
}

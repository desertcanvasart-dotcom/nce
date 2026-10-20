import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDraft, Placeholder } from "@/components/legal/LegalDraft";
import { pageMetadata } from "@/lib/seo/metadata";

// English only while in draft (ADR-031); /es/terms/ and /ja/terms/ return 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ locale: "en" }];
}

export const metadata: Metadata = pageMetadata({
  locale: "en",
  path: "/terms",
  title: "Terms of use (draft)",
  description: "Draft terms for using Nilecruz and booking Nile cruises and tours through it.",
  noindex: true,
});

export default async function TermsPage() {
  setRequestLocale("en");
  const t = await getTranslations({ locale: "en", namespace: "legal" });
  return (
    <LegalDraft title="Terms of use" updated="17 Oct 2026" banner={t("draftBanner")}>
      <p>
        These terms explain how Nilecruz works and what you agree to when you use the site, create an account or book. They are a
        draft written to describe how the service is designed. They are not legal advice and are not yet in force.
      </p>

      <h2>Who we are</h2>
      <p>
        Nilecruz is operated by <Placeholder>legal entity name</Placeholder>, registered in <Placeholder>country</Placeholder>{" "}
        under number <Placeholder>registration number</Placeholder>, with its registered address at{" "}
        <Placeholder>address</Placeholder>. You can reach us at <Placeholder>contact email</Placeholder>.
      </p>

      <h2>What Nilecruz does</h2>
      <p>
        Nilecruz is a marketplace and acts as a booking agent. Independent cruise operators supply the vessels, cabins, sailings
        and prices you see. We explain how vessels differ and publish our own evaluations. When you book a cruise, the operator
        named on your booking sells and provides it, and your contract for the cruise is with that operator. Nilecruz makes the
        booking and collects your payment on the operator’s behalf, and is paid a commission by the operator, which is included in
        the price you see.
      </p>
      <p>
        Our evaluations are our own assessments, made on the date shown. Reviews from other websites are shown separately, with
        their source, and are not our assessment.
      </p>

      <h2>Accounts</h2>
      <p>
        You need an account to see prices for every cabin and date, to send a request or to book. Keep your sign-in details
        private; you are responsible for activity on your account.
      </p>

      <h2>Requests and offers</h2>
      <p>
        When you describe a trip, suitable operators may send you personal offers. We do not guarantee that you will receive an
        offer or that an offer is the lowest available price. An offer does not hold a cabin: availability is checked again when
        you accept it.
      </p>

      <h2>Prices</h2>
      <ul>
        <li>Prices are per person, in the currency shown, and state what is included.</li>
        <li>A cruise runs from check-in to check-out. Airport and hotel transfers are not included unless the cruise says so.</li>
        <li>
          Children under 3 travel free. Children aged 3 to 5 pay 25% of the adult rate and children aged 6 to 11 pay 50%; guests
          aged 12 and over pay the adult rate. Ages are counted on the departure date. Some operators apply different rules, which
          are shown before you book.
        </li>
        <li>
          Crew gratuities are obligatory and are not part of the cruise price. They are paid directly to the vessel&apos;s front
          office at check-out, at the amount shown for that vessel, at least US$5 per guest aged 3 or over per night.
        </li>
      </ul>

      <h2>Paying for a cruise</h2>
      <p>Full payment is due within a deadline counted from the day you book, depending on when the cruise departs:</p>
      <ul>
        <li>
          Departures from 24 December to 7 January, and in other premium periods we publish (such as Easter): within 3 days.
        </li>
        <li>Other departures from October to April: within 7 days.</li>
        <li>Departures from May to September: within 14 days.</li>
      </ul>
      <p>
        If the departure is sooner, payment is due before departure. If a booking is not paid by its deadline, it is cancelled and
        the cabins are released. A payment you have reported but we have not yet verified is reviewed before anything is released.
        Card payments are processed by Stripe; we do not store your card details.
      </p>

      <h2>Tours and extras</h2>
      <p>
        Tours, transfers and other extras are sold by Nilecruz separately from cruises, with their own price, terms and payment. A
        tour payment does not count towards a cruise balance.
      </p>

      <h2>Cancellation</h2>
      <p>
        Each cruise and tour has its own cancellation policy, shown before you pay. You must accept it before paying. The charge
        it sets only ever comes out of what you have paid: if you cancel before paying anything, cancelling costs nothing, and if
        you have paid less than the charge, we keep what you paid and you owe nothing more. Refunds, where due, are calculated
        from that policy and returned to the original payment method.
      </p>

      <h2>Our responsibility</h2>
      <p>
        <Placeholder>
          limitation of liability, operator responsibility and force majeure wording, to be written with a lawyer
        </Placeholder>
      </p>

      <h2>Law and disputes</h2>
      <p>
        These terms are governed by the law of <Placeholder>governing law</Placeholder>.{" "}
        <Placeholder>dispute resolution and consumer-rights wording</Placeholder>
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. A booking keeps the terms, deadline and cancellation policy that applied when you made it.</p>
    </LegalDraft>
  );
}

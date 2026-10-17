import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDraft, Placeholder } from "@/components/legal/LegalDraft";
import { pageMetadata } from "@/lib/seo/metadata";

// English only while in draft (ADR-031).
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ locale: "en" }];
}

export const metadata: Metadata = pageMetadata({
  locale: "en",
  path: "/privacy",
  title: "Privacy (draft)",
  description: "Draft privacy notice: what Nilecruz collects, why, who it is shared with and your choices.",
  noindex: true,
});

export default async function PrivacyPage() {
  setRequestLocale("en");
  const t = await getTranslations({ locale: "en", namespace: "legal" });
  return (
    <LegalDraft title="Privacy" updated="17 Oct 2026" banner={t("draftBanner")}>
      <p>
        This notice explains what personal information Nilecruz collects, why, who sees it and what you can ask us to do. It is a
        draft describing how the service is designed. It is not legal advice and is not yet in force.
      </p>

      <h2>Who is responsible</h2>
      <p>
        <Placeholder>legal entity name and address</Placeholder> is responsible for your information. Contact:{" "}
        <Placeholder>privacy contact email</Placeholder>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email address, password (stored only as a secure hash) and language.</li>
        <li>Trip requests: dates, routes, number of guests, cabin preferences and budget, if you give one.</li>
        <li>
          Booking details: the names of everyone travelling, children&apos;s ages or dates of birth (to apply child prices),
          nationality or residence where a rate depends on it, and any documents you upload to prove eligibility.
        </li>
        <li>Payments: amounts, dates and status. Card details go directly to Stripe; we never see or store them.</li>
        <li>Technical data: basic logs of requests to our servers, kept for security and fault-finding.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account, send offers, take bookings and collect payment.</li>
        <li>To give the operator of your cruise the passenger details it needs to carry you.</li>
        <li>To meet legal, tax and accounting duties.</li>
        <li>To keep the service secure.</li>
      </ul>
      <p>
        Legal basis for each use:{" "}
        <Placeholder>legal bases (contract, legal obligation, legitimate interest), to be confirmed</Placeholder>
      </p>

      <h2>Who sees it</h2>
      <ul>
        <li>The operator of the cruise you book, and the supplier of any tour you book: only what they need for your trip.</li>
        <li>
          Service providers who process it for us: Supabase (database and accounts), Stripe (payments), Railway (hosting) and our
          email provider. <Placeholder>full processor list and where each stores data</Placeholder>
        </li>
        <li>Authorities, where the law requires it.</li>
      </ul>
      <p>We do not sell your information.</p>

      <h2>How long we keep it</h2>
      <p>
        <Placeholder>retention periods for accounts, bookings, payment records and documents</Placeholder>
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We use only what the site needs to work: a sign-in cookie when you have an account, and your browser&apos;s storage to
        remember the Day or Night theme. We do not use advertising cookies. If we add analytics, we will ask first.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of your information, ask us to correct it, or ask us to delete it where we are not required to keep
        it. <Placeholder>rights under the applicable law and how to complain to the regulator</Placeholder>
      </p>

      <h2>Changes</h2>
      <p>If this notice changes in a way that matters, we will tell you before the change applies.</p>
    </LegalDraft>
  );
}

import { ui } from "@/components/dashboard/ui";
import type { BankDetails as Details } from "@/server/payments/queries";

const ROWS = [
  ["holder", "Account holder"],
  ["bank", "Bank"],
  ["account_number", "Account number"],
  ["iban", "IBAN"],
  ["swift", "SWIFT / BIC"],
  ["currency", "Account currency"],
] as const;

/** CONTENT-NEEDED #5: where to send a bank transfer, from the finance-admin setting. */
export function BankDetails({ details, reference }: { details: Details | null; reference: string }) {
  if (!details?.holder) {
    return <p className={ui.muted}>Ask Nilecruz for the bank details, then report the transfer here so it can be checked.</p>;
  }
  return (
    <>
      <dl className={ui.grid}>
        {ROWS.filter(([k]) => details[k]).map(([k, label]) => (
          <div key={k}>
            <dt className={ui.label}>{label}</dt>
            <dd>{details[k]}</dd>
          </div>
        ))}
        <div>
          <dt className={ui.label}>Payment reference</dt>
          <dd>
            <strong>{reference}</strong>
          </dd>
        </div>
      </dl>
      {details.note ? <p className={ui.muted}>{details.note}</p> : null}
      <p className={ui.muted}>Put the reservation reference on the transfer, then report it here so Nilecruz can check it.</p>
    </>
  );
}

export const PARTNER_STATUS = [
  { value: "applied", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "paused", label: "Paused" },
  { value: "rejected", label: "Rejected" },
] as const;
export const partnerTone = { applied: "accent", approved: "success", paused: "neutral", rejected: "danger" } as const;

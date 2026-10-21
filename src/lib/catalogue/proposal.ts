/** The fields an operator can propose in a submission (DASH-ADM-035), shared by both sides of the review. */
export const PROPOSAL_FIELDS = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "route_text", label: "Route" },
  { key: "cabin_count", label: "Cabins" },
  { key: "max_guests", label: "Guests" },
  { key: "deck_count", label: "Decks" },
  { key: "year_built", label: "Year built" },
  { key: "mooring", label: "Mooring" },
  { key: "shared_spaces", label: "Shared spaces" },
  { key: "description_en", label: "Description (English)" },
] as const;
export type ProposalKey = (typeof PROPOSAL_FIELDS)[number]["key"];
export type Proposal = Partial<Record<ProposalKey, string>>;

export const EVENT_LABEL: Record<string, string> = {
  created: "Draft created",
  edited: "Proposal edited",
  submitted: "Submitted for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

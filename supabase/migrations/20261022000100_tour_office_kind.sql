-- Batch 7-2 (ADR-097): the Luxor and Aswan offices run Nilecruz's tours and get their own dashboard as a company type.
-- On its own, because a new enum value can't be used in the transaction that adds it.
alter type public.org_kind add value if not exists 'tour_office';

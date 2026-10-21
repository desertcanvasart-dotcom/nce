-- Operator loop (docs/briefs/BATCH-08-OPERATOR-LOOP.md): two new sources of availability. On their own, because a new
-- enum value can't be used in the transaction that adds it.
--   tap    an operator's answer to a booking request (confirm, decline, hold): counts for 2 hours, that cabin type only
--   sheet  a vacancy sheet the operator sent, read and confirmed by Nilecruz: counts for 7 days, like manual data
alter type public.inventory_source add value if not exists 'tap';
alter type public.inventory_source add value if not exists 'sheet';

import { z } from "zod";

/**
 * SEC-011 (Batch 11): what a booking form's bound arguments may hold. Server action arguments come from the browser,
 * so they are checked before any guest list is built from them (an unchecked `cabins: 1e9` would exhaust memory).
 * The database re-checks prices, availability and occupancy as before.
 */
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const age = z.number().int().min(0).max(120);

export const planSchema = z.object({
  departureId: uuid,
  departsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cabinTypeId: uuid,
  currency: z.string().regex(/^[A-Z]{3}$/),
  cabins: z.number().int().min(1).max(5),
  ages: z.array(age).min(1).max(3),
  package: z.enum(["cruise", "with_sightseeing", "with_programme"]).optional(),
});

/** An offer's party: at most a full ship's worth of guests. */
export const partySchema = z.object({
  adults: z.number().int().min(1).max(60),
  childAges: z.array(z.number().int().min(0).max(17)).max(60),
});

export const PLAN_PROBLEM = "That booking can't be made as sent. Go back to the dates and choose again.";

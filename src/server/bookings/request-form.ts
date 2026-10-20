import "server-only";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requestProblems } from "@/lib/bookings/bookings";
import { priceToMinor } from "@/lib/connections/format";
import { cairoDate } from "@/lib/tours/tours";
import { failed, formObject, problemsFrom } from "@/server/catalogue/form";

/** A cruise request form, as customers (DASH-CUS-004, 014, 015) and travel partners (DASH-B2B-004) send it. */
const requestInput = z.object({
  route: z.string(),
  earliest_departure: z.iso.date({ message: "choose a date" }),
  latest_departure: z.iso.date({ message: "choose a date" }),
  latest_finish: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date({ message: "a date" }).nullable()),
  nights_min: z.coerce.number().int("a whole number").min(1).max(21),
  nights_max: z.coerce.number().int("a whole number").min(1).max(21),
  adults: z.coerce.number().int("a whole number").min(1, "at least one adult").max(30),
  child_ages: z.string().trim().max(80),
  cabins: z.coerce.number().int("a whole number").min(1).max(30),
  cabin_notes: z.string().trim().max(500),
  budget: z.string().trim(),
  budget_currency: z.enum(["USD", "EUR", "EGP"]),
  notes: z.string().trim().max(2000),
});

export type RequestRow = {
  origin: string | null;
  destination: string | null;
  earliest_departure: string;
  latest_departure: string;
  latest_finish: string | null;
  nights_min: number;
  nights_max: number;
  adults: number;
  child_ages: number[];
  cabins: number;
  cabin_notes: string | null;
  budget_minor: number | null;
  budget_currency: "USD" | "EUR" | "EGP" | null;
  notes: string | null;
};

export function parseRequest(fd: FormData): { ok: true; row: RequestRow } | { ok: false; state: ActionState } {
  const input = requestInput.safeParse(formObject(fd));
  if (!input.success) {
    return {
      ok: false,
      state: problemsFrom(input.error, {
        earliest_departure: "Earliest departure",
        latest_departure: "Latest departure",
        latest_finish: "Back by",
        nights_min: "Shortest stay",
        nights_max: "Longest stay",
        adults: "Adults",
        cabins: "Cabins",
        child_ages: "Children's ages",
      }),
    };
  }
  const d = input.data;
  const ages = d.child_ages ? d.child_ages.split(/[\s,]+/).filter(Boolean) : [];
  if (ages.some((a) => !/^\d{1,2}$/.test(a)))
    return { ok: false, state: failed("Give each child's age as a whole number, separated by commas, for example “7, 4”.") };
  const child_ages = ages.map(Number);
  const problems = requestProblems({ ...d, child_ages }, cairoDate(new Date()));
  if (problems.length) return { ok: false, state: { ok: false, message: "The request can't be sent yet:", problems } };
  let budget_minor: number | null = null;
  if (d.budget) {
    budget_minor = priceToMinor(d.budget.replace(/,/g, ""));
    if (budget_minor === null) return { ok: false, state: failed("Give the budget as an amount, for example 4000.") };
  }
  const [origin, destination] = d.route ? d.route.split("→") : [null, null];
  return {
    ok: true,
    row: {
      origin: origin || null,
      destination: destination || null,
      earliest_departure: d.earliest_departure,
      latest_departure: d.latest_departure,
      latest_finish: d.latest_finish,
      nights_min: d.nights_min,
      nights_max: d.nights_max,
      adults: d.adults,
      child_ages,
      cabins: d.cabins,
      cabin_notes: d.cabin_notes || null,
      budget_minor,
      budget_currency: budget_minor === null ? null : d.budget_currency,
      notes: d.notes || null,
    },
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";

const DIMENSIONS = ["hygiene", "service", "food", "amenities", "management", "cabin_vessel", "cruise_experience"];

/**
 * A published evaluation scoring 80/100 (every criterion 4 of 5). `verified` with everything the vessel page needs to
 * publish it (role, method, conclusion, strengths, watch points, a note per dimension); otherwise the page hides it.
 */
export async function insertEvaluation(db: SupabaseClient<Database>, vesselId: string, verified = true): Promise<string> {
  const { data, error } = await db
    .from("evaluations")
    .insert({
      vessel_id: vesselId,
      assessed_on: "2026-10-01",
      evaluator: "Sample evaluator",
      verdict: "recommended",
      scores: Object.fromEntries(DIMENSIONS.map((d) => [d, [4, 4, 4, 4]])),
      published: true,
      published_at: new Date().toISOString(),
      verified,
      evaluator_role: verified ? "Former boat manager" : null,
      assessment_method: verified ? "onboard_inspection" : null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("no evaluation");
  if (verified) {
    const { error: te } = await db.from("evaluation_translations").insert({
      evaluation_id: data.id,
      locale: "en",
      verdict_summary: "A sample ship, evaluated for the tests.",
      strengths: ["A sample strength"],
      watch_points: ["A sample watch point"],
      dimension_notes: Object.fromEntries(DIMENSIONS.map((d) => [d, `A sample note on ${d}.`])),
    });
    if (te) throw te;
  }
  return data.id;
}

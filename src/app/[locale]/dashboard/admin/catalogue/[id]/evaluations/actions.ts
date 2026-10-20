"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { DIMENSIONS, METHOD_VERSION, type Scores } from "@/lib/evaluation/method";
import { requireAdmin } from "@/server/auth";
import { dbProblem, formObject, problemsFrom } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { criterionScore, evaluationInput } from "@/server/validation";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";

/** DASH-ADM-026–032: evaluations are entered from the vessel's editor; the database calculates the results. */
export async function saveEvaluation(
  vesselId: string,
  evaluationId: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin(["catalogue"], `/dashboard/admin/catalogue/${vesselId}/`);
  const raw = formObject(fd);
  const input = evaluationInput.safeParse(raw);
  const problems: string[] = [];
  const scores = {} as Scores;
  for (const d of DIMENSIONS) {
    const four = [0, 1, 2, 3].map((i) => {
      const r = criterionScore.safeParse(raw[`s_${d.key}_${i}`] ?? "");
      if (!r.success) problems.push(`${d.label}, ${d.criteria[i]}: ${r.error.issues[0]?.message}`);
      return r.success ? r.data : 0;
    });
    scores[d.key] = four as [number, number, number, number];
  }
  if (!input.success) {
    const p = problemsFrom(input.error, {
      assessed_on: "Assessment date",
      evaluator: "Evaluator or team",
      verdict: "Verdict",
      notes_en: "Notes (English)",
    });
    return { ...p, problems: [...(p.problems ?? []), ...problems] };
  }
  if (problems.length) return { ok: false, message: "Nothing was saved. Please fix:", problems };

  const db = await getDb();
  const d = input.data;
  const row = {
    vessel_id: vesselId,
    method_version: METHOD_VERSION,
    assessed_on: d.assessed_on,
    evaluator: d.evaluator,
    verdict: d.verdict,
    scores,
    published: d.published,
    published_at: d.published ? new Date().toISOString() : null,
  };
  const res = evaluationId
    ? await db.from("evaluations").update(row).eq("id", evaluationId).eq("vessel_id", vesselId).select("id").single()
    : await db.from("evaluations").insert(row).select("id").single();
  if (res.error) return dbProblem(res.error);
  const id = res.data.id;
  const notes = (["en", "es", "ja"] as const).map((locale) => ({ evaluation_id: id, locale, notes: d[`notes_${locale}`] }));
  const t = await db.from("evaluation_translations").upsert(notes, { onConflict: "evaluation_id,locale" });
  if (t.error) return dbProblem(t.error);
  revalidatePath(`/dashboard/admin/catalogue/${vesselId}/`);
  revalidateCatalogue();
  redirect(`/dashboard/admin/catalogue/${vesselId}/?saved=evaluation#evaluations`);
}

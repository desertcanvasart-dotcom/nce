import Link from "next/link";
import { notFound } from "next/navigation";
import type { DimensionKey } from "@/lib/evaluation/method";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../../../sections";
import { EvaluationForm } from "../EvaluationForm";

export default async function EditEvaluation({ params }: { params: Promise<{ id: string; evalId: string }> }) {
  const { id, evalId } = await params;
  if (!isUuid(id) || !isUuid(evalId)) notFound();
  await requireAdmin(["catalogue"], `/dashboard/admin/catalogue/${id}/evaluations/${evalId}/`);
  const db = await getDb();
  const { data: e } = await db
    .from("evaluations")
    .select(
      "id, assessed_on, evaluator, verdict, scores, published, evaluation_translations(locale, notes), vessel:vessels(name)",
    )
    .eq("id", evalId)
    .eq("vessel_id", id)
    .maybeSingle();
  if (!e || !e.vessel) notFound();
  const notes = Object.fromEntries(e.evaluation_translations.map((t) => [t.locale, t.notes ?? ""]));
  return (
    <>
      <p>
        <Link href={`/dashboard/admin/catalogue/${id}/#evaluations`}>← {e.vessel.name}</Link>
      </p>
      <EvaluationForm
        vesselId={id}
        vesselName={e.vessel.name}
        value={{
          id: e.id,
          assessed_on: e.assessed_on,
          evaluator: e.evaluator,
          verdict: e.verdict,
          scores: e.scores as Partial<Record<DimensionKey, number[]>>,
          published: e.published,
          notes,
        }}
      />
    </>
  );
}

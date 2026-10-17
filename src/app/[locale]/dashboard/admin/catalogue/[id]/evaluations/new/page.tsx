import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../../../sections";
import { EvaluationForm } from "../EvaluationForm";

export default async function NewEvaluation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  await requireAdmin(["catalogue"], `/dashboard/admin/catalogue/${id}/evaluations/new/`);
  const db = await getDb();
  const { data: v } = await db.from("vessels").select("name").eq("id", id).maybeSingle();
  if (!v) notFound();
  return (
    <>
      <p>
        <Link href={`/dashboard/admin/catalogue/${id}/#evaluations`}>← {v.name}</Link>
      </p>
      <EvaluationForm vesselId={id} vesselName={v.name} />
    </>
  );
}

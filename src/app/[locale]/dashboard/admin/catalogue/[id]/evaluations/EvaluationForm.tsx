import { ActionForm } from "@/components/dashboard/ActionForm";
import { EvaluationScores } from "@/components/dashboard/EvaluationScores";
import { Checkboxes, Input, Select, TextArea, ui } from "@/components/dashboard/ui";
import { VERDICTS, type DimensionKey } from "@/lib/evaluation/method";
import { saveEvaluation } from "./actions";

export type EvaluationValues = {
  id: string;
  assessed_on: string;
  evaluator: string;
  verdict: string;
  scores: Partial<Record<DimensionKey, number[]>>;
  published: boolean;
  notes: Record<string, string>;
};

export function EvaluationForm({
  vesselId,
  vesselName,
  value,
}: {
  vesselId: string;
  vesselName: string;
  value?: EvaluationValues;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1 className={ui.pageTitle}>
        {value ? "Edit evaluation" : "New evaluation"} · {vesselName}
      </h1>
      <p className={ui.muted}>
        Method version 1: seven dimensions, four criteria each, scored 0 to 5 (half points allowed). The weighted result and the
        overall score out of 100 are calculated when you save.
      </p>
      <ActionForm action={saveEvaluation.bind(null, vesselId, value?.id ?? null)} submit="Save evaluation">
        <div className={ui.grid}>
          <Input label="Assessment date" name="assessed_on" type="date" required max={today} defaultValue={value?.assessed_on} />
          <Input label="Evaluator or team" name="evaluator" required maxLength={120} defaultValue={value?.evaluator} />
          <Select
            label="Verdict"
            name="verdict"
            required
            placeholder="Choose a verdict"
            defaultValue={value?.verdict}
            options={VERDICTS}
          />
        </div>
        <EvaluationScores initial={value?.scores} />
        <TextArea
          label="Notes for travellers (English)"
          name="notes_en"
          lang="en"
          maxLength={4000}
          defaultValue={value?.notes.en}
        />
        <TextArea
          label="Spanish"
          name="notes_es"
          lang="es"
          maxLength={4000}
          defaultValue={value?.notes.es}
          hint="Optional. Empty shows the English notes."
        />
        <TextArea
          label="Japanese"
          name="notes_ja"
          lang="ja"
          maxLength={4000}
          defaultValue={value?.notes.ja}
          hint="Optional. Empty shows the English notes."
        />
        <Checkboxes
          legend="Publication"
          name="published"
          options={[{ value: "yes", label: "Publish this evaluation on the vessel page" }]}
          checked={value?.published ? ["yes"] : []}
          hint="Unpublished evaluations are never shown outside Nilecruz."
        />
      </ActionForm>
    </>
  );
}

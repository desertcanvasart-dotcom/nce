import type { VesselType } from "@/components/ds/lib/types";

/**
 * "Which boat suits you?" on /vessels/ (PAGE-026, Islam's vessels brief of 3 Nov 2026): three questions, each answer
 * adding points to vessel types. The highest total wins; a tie goes to the type chosen in the first question.
 */
export type ChooserQuestion = "priority" | "days" | "party";

export const CHOOSER: { id: ChooserQuestion; answers: { id: string; score: Partial<Record<VesselType, number>> }[] }[] = [
  {
    id: "priority",
    answers: [
      { id: "quiet", score: { sail: 2 } },
      { id: "facilities", score: { motor: 2 } },
      { id: "character", score: { steam: 2 } },
    ],
  },
  {
    id: "days",
    answers: [
      { id: "slow", score: { sail: 1 } },
      { id: "schedule", score: { motor: 1 } },
      { id: "gentle", score: { steam: 1 } },
    ],
  },
  {
    id: "party",
    answers: [
      { id: "small", score: { sail: 1, steam: 1 } },
      { id: "family", score: { motor: 1 } },
      { id: "unsure", score: {} },
    ],
  },
];

const TYPES: VesselType[] = ["sail", "motor", "steam"];

/** The recommended type once every question is answered, else null. */
export function recommend(answers: Partial<Record<ChooserQuestion, string>>): VesselType | null {
  const picked = CHOOSER.map((q) => q.answers.find((a) => a.id === answers[q.id]));
  if (picked.some((a) => !a)) return null;
  const total = (t: VesselType) => picked.reduce((n, a) => n + (a!.score[t] ?? 0), 0);
  const best = Math.max(...TYPES.map(total));
  const leaders = TYPES.filter((t) => total(t) === best);
  if (leaders.length === 1) return leaders[0]!;
  // A tie: the first question's type.
  return (Object.keys(picked[0]!.score) as VesselType[])[0]!;
}

/** Brand copy rules (BRAND-001, BRAND-002), shared by scripts/copy-lint.ts and its tests. */
export type CopyProblem = { rule: "banned-word" | "exclamation" | "emoji"; match: string };

const BANNED = [/\bbest\b(?!\s+for\b)/i, /\bunbeatable\b/i, /\bonce[-\s]in[-\s]a[-\s]lifetime\b/i];
const EXCLAMATION = /[!！]/;
// ©, ® and ™ are "pictographic" in Unicode but are ordinary typography, not emoji.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;

export function lintText(text: string): CopyProblem[] {
  const out: CopyProblem[] = [];
  for (const re of BANNED) {
    const m = re.exec(text);
    if (m) out.push({ rule: "banned-word", match: m[0] });
  }
  const ex = EXCLAMATION.exec(text);
  if (ex) out.push({ rule: "exclamation", match: ex[0] });
  const em = EMOJI.exec(text);
  if (em) out.push({ rule: "emoji", match: em[0] });
  return out;
}

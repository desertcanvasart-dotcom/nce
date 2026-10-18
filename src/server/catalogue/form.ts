import "server-only";
import type { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";

/** Reads a form into a plain object; repeated names (checkboxes) become arrays. */
export function formObject(fd: FormData, arrays: string[] = []): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const k of new Set(fd.keys())) {
    if (arrays.includes(k)) out[k] = fd.getAll(k).filter((v): v is string => typeof v === "string");
    else {
      const v = fd.get(k);
      if (typeof v === "string") out[k] = v;
    }
  }
  for (const a of arrays) out[a] ??= [];
  return out;
}

/** zod issues → a short list people can act on, using the field labels they see. */
export function problemsFrom(error: z.ZodError, labels: Record<string, string>): ActionState {
  const problems = error.issues.map((i) => {
    const key = String(i.path[0] ?? "");
    return `${labels[key] ?? key}: ${i.message}`;
  });
  return { ok: false, message: "Nothing was saved. Please fix:", problems: [...new Set(problems)] };
}

export const saved = (message: string): ActionState => ({ ok: true, message });
export const failed = (message: string): ActionState => ({ ok: false, message });

/** Database errors in words (RLS refusals, guards, constraint names) without leaking internals. */
export function dbProblem(e: { code?: string; message?: string } | null): ActionState {
  if (!e) return failed("Something went wrong. Try again.");
  if (e.code === "42501")
    return failed(e.message?.startsWith("This vessel is under review") ? e.message : "Your role can't make this change.");
  if (e.code === "23505") return failed("That already exists (for example the same address or source reference).");
  if (e.code === "23514")
    return failed("A rule was broken: check the values (for example a showcase needs a date and a reason).");
  return failed("Something went wrong on our side. Nothing was saved.");
}

import { z } from "zod";

/** Field errors keyed by path ("cabin_count", "storage_path"), ready for a form (SEC-004). */
export type FieldErrors = Record<string, string[]>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/**
 * Every server action and route handler validates its input with this before touching the database (SEC-004).
 * Unknown input is never trusted, even from our own forms.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false, errors };
}

/** Wraps a server action so its first argument is validated first. */
export function withInput<S extends z.ZodType, R>(schema: S, run: (data: z.output<S>) => Promise<R>) {
  return async (input: unknown): Promise<Parsed<R>> => {
    const parsed = parseInput(schema, input);
    if (!parsed.ok) return parsed;
    return { ok: true, data: await run(parsed.data) };
  };
}

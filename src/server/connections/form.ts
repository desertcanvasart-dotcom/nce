import "server-only";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { dbProblem, failed } from "@/server/catalogue/form";

/**
 * The connection functions raise their refusals in plain words (migration 20261018000800), so those are shown
 * as written; anything else falls back to the general wording that reveals no internals.
 */
export function connectionProblem(e: { code?: string; message?: string }): ActionState {
  if (e.message && ["22023", "23514", "P0002", "42501"].includes(e.code ?? "") && !/violates|constraint|column|relation/.test(e.message)) {
    return failed(e.message.endsWith(".") ? e.message : `${e.message}.`);
  }
  return dbProblem(e);
}

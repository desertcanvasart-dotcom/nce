"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ds/Button/Button";
import styles from "./ui.module.css";

export type ActionState = { ok?: boolean; message?: string; problems?: string[] };
export type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Every dashboard form: posts to a server action (works before JavaScript loads), then shows the outcome
 * above the fields: what was saved, or a plain list of what to fix.
 */
export function ActionForm({
  action,
  submit,
  children,
  variant = "primary",
  encType,
  className,
}: {
  action: FormAction;
  submit: string;
  children?: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  encType?: "multipart/form-data";
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={run} className={className ?? styles.form} encType={encType} noValidate>
      {state.message ? (
        <div
          className={[styles.notice, state.ok ? styles.noticeSuccess : styles.noticeError].join(" ")}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
          {state.problems?.length ? (
            <ul>
              {state.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {children}
      <div className={styles.actions}>
        <Button variant={variant} type="submit" disabled={pending}>
          {submit}
        </Button>
      </div>
    </form>
  );
}

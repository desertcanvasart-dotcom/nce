"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ds/Button/Button";
import styles from "./ui.module.css";

export type ActionState = { ok?: boolean; message?: string; problems?: string[] };
export type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Every dashboard form: posts to a server action, then shows the outcome above the fields: what was saved,
 * or a plain list of what to fix.
 *
 * With JavaScript, it submits through a transition: React would otherwise reset the form when the action
 * finishes, and someone who missed one field would lose everything they typed. Without JavaScript, the
 * plain `action` posts the form as usual. `resetOnSuccess` clears "add" forms after a successful save.
 */
export function ActionForm({
  action,
  submit,
  children,
  variant = "primary",
  encType,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  submit: string;
  children?: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  encType?: "multipart/form-data";
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(action, {} as ActionState);
  const [, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) form.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={form}
      action={run}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
      className={className ?? styles.form}
      encType={encType}
      noValidate
    >
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

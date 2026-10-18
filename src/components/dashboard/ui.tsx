import type { ReactNode } from "react";
import { useId } from "react";
import { cx } from "@/components/ds/lib/cx";
import styles from "./ui.module.css";

/** Dashboard form kit: labels above inputs (dense admin forms), plain HTML so it works without JavaScript. */
export { styles as ui };

type Base = { label: string; name: string; hint?: string; error?: string; required?: boolean };

function Shell({ id, label, hint, error, required, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describe = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

export function Input({
  type = "text",
  defaultValue,
  inputMode,
  min,
  max,
  step,
  maxLength,
  autoComplete,
  ...base
}: Base & {
  type?: string;
  defaultValue?: string | number | null;
  inputMode?: "numeric" | "decimal" | "email" | "url" | "text";
  min?: number | string;
  max?: number | string;
  step?: number | string;
  maxLength?: number;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} {...base}>
      <input
        id={id}
        className={styles.input}
        type={type}
        name={base.name}
        required={base.required}
        defaultValue={defaultValue ?? undefined}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        autoComplete={autoComplete ?? "off"}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describe(id, base.hint, base.error)}
      />
    </Shell>
  );
}

export function TextArea({
  defaultValue,
  rows = 5,
  maxLength,
  lang,
  ...base
}: Base & { defaultValue?: string | null; rows?: number; maxLength?: number; lang?: string }) {
  const id = useId();
  return (
    <Shell id={id} {...base}>
      <textarea
        id={id}
        className={styles.input}
        name={base.name}
        rows={rows}
        maxLength={maxLength}
        lang={lang}
        required={base.required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describe(id, base.hint, base.error)}
      />
    </Shell>
  );
}

export function Select({
  options,
  defaultValue,
  placeholder,
  ...base
}: Base & { options: readonly { value: string; label: string }[]; defaultValue?: string | null; placeholder?: string }) {
  const id = useId();
  return (
    <Shell id={id} {...base}>
      <select
        id={id}
        className={styles.input}
        name={base.name}
        required={base.required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describe(id, base.hint, base.error)}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function Checkboxes({
  legend,
  name,
  options,
  checked,
  hint,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  checked: readonly string[];
  hint?: string;
}) {
  return (
    <fieldset className={styles.choices}>
      <legend className={styles.label}>{legend}</legend>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {options.map((o) => (
        <label key={o.value} className={styles.choice}>
          <input type="checkbox" name={name} value={o.value} defaultChecked={checked.includes(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

export function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <p
      className={cx(styles.notice, tone === "error" && styles.noticeError, tone === "success" && styles.noticeSuccess)}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

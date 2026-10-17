"use client";

import { useId, useState } from "react";
import { cx } from "../lib/cx";
import styles from "./TextField.module.css";

export type TextFieldProps = {
  label: string;
  name?: string;
  type?: string;
  hint?: string;
  /** Say how to fix the problem ("Add a country code, e.g. +20") (A11Y-007). */
  error?: string;
  multiline?: boolean;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  /** Mobile keyboard hint, e.g. "numeric" for a six-digit code. */
  inputMode?: "text" | "numeric" | "email" | "tel";
  maxLength?: number;
  onChange?: (value: string) => void;
};

/** Underlined field with a floating label, brass focus bar and hint or error (COMP-TextField). Works in plain forms without JavaScript. */
export function TextField({
  label,
  name,
  type = "text",
  hint,
  error,
  multiline,
  required,
  autoComplete,
  defaultValue,
  inputMode,
  maxLength,
  onChange,
}: TextFieldProps) {
  const id = useId();
  const [focus, setFocus] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const describedBy = error || hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name,
    required,
    autoComplete,
    inputMode,
    maxLength,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onChange: (e: { target: { value: string } }) => {
      setValue(e.target.value);
      onChange?.(e.target.value);
    },
  };

  return (
    <div className={cx(styles.tf, (focus || value) && styles.up, focus && styles.focus, error && styles.error)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {multiline ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
      <span className={styles.bar} aria-hidden="true" />
      {error || hint ? (
        <span className={styles.hint} id={describedBy}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

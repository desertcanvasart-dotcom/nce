import styles from "./Honeypot.module.css";

/**
 * SEC-006 (ADR-101): a field people never see or reach with the keyboard; bots that fill every field fill it in. The
 * server action checks it with `trapFilled` and answers as if it worked, keeping nothing.
 */
export function Honeypot() {
  return (
    <div className={styles.trap} aria-hidden="true">
      <label>
        Leave this empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

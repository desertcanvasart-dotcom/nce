import Link from "next/link";
import styles from "./status.module.css";

/** HTTP 403 (ADR-067): a signed-in person asked for a workspace or section that isn't theirs. The content is never sent. */
export default function Forbidden() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={styles.status}
      style={{ margin: "0 auto", padding: "var(--space-9) var(--space-5)" }}
    >
      <title>Not part of your account | Nilecruz</title>
      <p>
        <Link href="/" className={styles.brand}>
          Nilecruz
        </Link>
      </p>
      <p className={styles.code}>403</p>
      <h1 className={styles.title}>This is not part of your account</h1>
      <p className={styles.body}>
        You are signed in, but this page belongs to another workspace or needs a different role. If you think you should have
        access, ask the owner of your company account or contact Nilecruz.
      </p>
      <p className={styles.actions}>
        <Link href="/dashboard/">Go to your dashboard</Link>
        <Link href="/">Nilecruz home</Link>
      </p>
    </main>
  );
}

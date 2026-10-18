import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The connections tests pull a feed from a local https server (SEC-007 allows only https). Its certificate is made
 * here, for 127.0.0.1 only, and never committed; the app trusts it through NILECRUZ_FEED_TEST_CA, which is honoured
 * only when the app runs against the local database (src/server/connections/policy.ts).
 */
export const FEED_TEST_PORT = 55499;
export const FEED_TEST_ORIGIN = `https://127.0.0.1:${FEED_TEST_PORT}`;
const dir = join(tmpdir(), "nilecruz-feed-tls");
export const FEED_TLS = { key: join(dir, "key.pem"), cert: join(dir, "cert.pem") };

export function ensureFeedCertificate(): void {
  const fresh = existsSync(FEED_TLS.cert) && Date.now() - statSync(FEED_TLS.cert).mtimeMs < 7 * 86_400_000;
  if (fresh) return;
  mkdirSync(dir, { recursive: true });
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      FEED_TLS.key,
      "-out",
      FEED_TLS.cert,
      "-days",
      "30",
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );
}

/** A test-only value: the scheduler's shared secret for the local e2e server (never used anywhere else). */
export const FEED_PULL_TEST_SECRET = "e2e-local-only-feed-pull-secret-0000";

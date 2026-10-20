import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";

/**
 * Signed, idempotent API calls and signed webhooks (SEC-008, SEC-009, ADR-085).
 *
 * Operators sign each request with an Ed25519 private key that only they hold; Nilecruz keeps the public key.
 * A stolen copy of our database therefore can't be used to call the API as an operator, and no secret has to be
 * stored at all (a hash of a shared secret would not do: verifying an HMAC needs the secret itself).
 *
 * The signed text is, joined by line breaks:
 *   nilecruz-v1, METHOD, path, unix time in seconds, idempotency key, SHA-256 of the body (hex)
 * Requests more than five minutes from our clock are refused, so a captured request can't be replayed later;
 * within those five minutes the idempotency key makes a replay return the first answer without applying twice.
 */

export const SIGNATURE_VERSION = "nilecruz-v1";
export const TOLERANCE_SECONDS = 300;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_.:-]{8,100}$/;
export const KEY_ID = /^nck_[0-9a-f]{20}$/;

export const sha256Hex = (body: string | Uint8Array) => createHash("sha256").update(body).digest("hex");

export type RequestParts = { method: string; path: string; timestamp: string; idempotencyKey: string; bodySha256: string };

export function canonicalRequest(p: RequestParts): string {
  return [SIGNATURE_VERSION, p.method.toUpperCase(), p.path, p.timestamp, p.idempotencyKey, p.bodySha256].join("\n");
}

/** A new key pair: the public key (base64 of the 32 raw bytes) to store, the private key (PEM) to show once. */
export function generateApiKeyPair(): { publicKey: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  return {
    publicKey: Buffer.from(jwk.x!, "base64url").toString("base64"),
    privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  };
}

function publicKeyFrom(base64: string) {
  const raw = Buffer.from(base64, "base64");
  if (raw.length !== 32) throw new Error("bad public key");
  return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") }, format: "jwk" });
}

/** What an operator's system does (also used by our tests and the format document's example). */
export function signRequest(privateKeyPem: string, p: RequestParts): string {
  return sign(null, Buffer.from(canonicalRequest(p)), createPrivateKey(privateKeyPem)).toString("base64");
}

export type VerifyResult = { ok: true } | { ok: false; reason: "malformed" | "expired" | "bad-signature" };

export function verifyRequest(
  publicKeyBase64: string,
  signatureBase64: string,
  p: RequestParts,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (
    !/^\d{9,11}$/.test(p.timestamp) ||
    !IDEMPOTENCY_KEY.test(p.idempotencyKey) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(signatureBase64)
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (Math.abs(nowSeconds - Number(p.timestamp)) > TOLERANCE_SECONDS) return { ok: false, reason: "expired" };
  const sig = Buffer.from(signatureBase64, "base64");
  if (sig.length !== 64) return { ok: false, reason: "malformed" };
  try {
    return verify(null, Buffer.from(canonicalRequest(p)), publicKeyFrom(publicKeyBase64), sig)
      ? { ok: true }
      : { ok: false, reason: "bad-signature" };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

// ── The scheduler's call to pull feeds (ADR-081): HMAC-SHA256 of "feed-pull.<unix time>", hex ───────────────
export function pullSignature(secret: string, timestamp: string): string {
  return createHmac("sha256", secret).update(`feed-pull.${timestamp}`).digest("hex");
}

export function verifyPull(
  secret: string,
  timestamp: string,
  signatureHex: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{9,11}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signatureHex)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  return timingSafeEqual(Buffer.from(pullSignature(secret, timestamp), "hex"), Buffer.from(signatureHex, "hex"));
}

// ── Refreshing the public marketplace (PERF-010): the same secret, its own message, so a pull can't be replayed as one
export function refreshSignature(secret: string, timestamp: string): string {
  return createHmac("sha256", secret).update(`catalogue-refresh.${timestamp}`).digest("hex");
}

export function verifyRefresh(
  secret: string,
  timestamp: string,
  signatureHex: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{9,11}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signatureHex)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  return timingSafeEqual(Buffer.from(refreshSignature(secret, timestamp), "hex"), Buffer.from(signatureHex, "hex"));
}

// ── Outbound webhooks (SEC-009; sent from Batch 4e) ────────────────────────────────────────────────────────
// Signed the same way, with Nilecruz's own Ed25519 key; operators verify with our published public key.
export function webhookCanonical(timestamp: string, eventId: string, body: string): string {
  return ["nilecruz-webhook-v1", timestamp, eventId, sha256Hex(body)].join("\n");
}

export function signWebhook(
  privateKeyPem: string,
  eventId: string,
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Record<string, string> {
  const timestamp = String(nowSeconds);
  return {
    "Nilecruz-Event-Id": eventId,
    "Nilecruz-Timestamp": timestamp,
    "Nilecruz-Signature": sign(
      null,
      Buffer.from(webhookCanonical(timestamp, eventId, body)),
      createPrivateKey(privateKeyPem),
    ).toString("base64"),
  };
}

export function verifyWebhook(
  publicKeyBase64: string,
  headers: Record<string, string>,
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const ts = headers["Nilecruz-Timestamp"] ?? "";
  if (!/^\d{9,11}$/.test(ts) || Math.abs(nowSeconds - Number(ts)) > TOLERANCE_SECONDS) return false;
  try {
    return verify(
      null,
      Buffer.from(webhookCanonical(ts, headers["Nilecruz-Event-Id"] ?? "", body)),
      publicKeyFrom(publicKeyBase64),
      Buffer.from(headers["Nilecruz-Signature"] ?? "", "base64"),
    );
  } catch {
    return false;
  }
}

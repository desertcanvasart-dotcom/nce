import "server-only";
import { FormatError, LIMITS, parseInventory } from "@/lib/connections/format";
import { IDEMPOTENCY_KEY, KEY_ID, sha256Hex, verifyRequest } from "@/lib/connections/signature";
import { getAdminDb } from "@/server/db/admin";
import type { Json } from "@/server/db/database.types";

/**
 * POST /api/v1/inventory/ (DASH-OPR-026, SEC-008, SEC-009). Every call is signed with the operator's private key
 * and carries an idempotency key: a repeated call returns the first answer and never applies twice.
 * Answers are JSON; errors are { error: { code, message } } with the message in plain words.
 */

function problem(status: number, code: string, message: string, extra: Record<string, string> = {}) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

const SIGNATURE_MESSAGES = {
  malformed: "The signature headers are not in the expected form. See the format document, “Signing requests”.",
  expired: "The timestamp is more than five minutes away from Nilecruz’s clock. Check your server’s time and sign again.",
  "bad-signature": "The signature doesn’t match this request. Sign the exact method, path, timestamp, idempotency key and body.",
} as const;

export async function handleInventoryPost(request: Request): Promise<Response> {
  const keyId = request.headers.get("nilecruz-key") ?? "";
  const timestamp = request.headers.get("nilecruz-timestamp") ?? "";
  const signature = request.headers.get("nilecruz-signature") ?? "";
  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (!keyId || !timestamp || !signature || !idempotencyKey) {
    return problem(401, "missing-signature", "Send the Nilecruz-Key, Nilecruz-Timestamp, Nilecruz-Signature and Idempotency-Key headers.");
  }
  if (!KEY_ID.test(keyId)) return problem(401, "unknown-key", "This key doesn’t exist or was revoked.");
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return problem(400, "bad-idempotency-key", "The Idempotency-Key must be 8 to 100 letters, numbers or the characters _ . : -");
  }
  if (Number(request.headers.get("content-length") ?? 0) > LIMITS.apiBytes) {
    return problem(413, "too-large", "The body is larger than 2 MB. Send the data in smaller parts.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > LIMITS.apiBytes) return problem(413, "too-large", "The body is larger than 2 MB. Send the data in smaller parts.");

  const db = getAdminDb();
  const { data: key } = await db
    .from("api_keys")
    .select("id, org_id, public_key, revoked_at, organisation:organisations!inner(status)")
    .eq("key_id", keyId)
    .maybeSingle();
  if (!key || key.revoked_at) return problem(401, "unknown-key", "This key doesn’t exist or was revoked.");

  const bodySha256 = sha256Hex(bytes);
  const path = new URL(request.url).pathname;
  const verified = verifyRequest(key.public_key, signature, { method: request.method, path, timestamp, idempotencyKey, bodySha256 });
  if (!verified.ok) return problem(401, verified.reason, SIGNATURE_MESSAGES[verified.reason]);
  if (key.organisation.status !== "approved") {
    return problem(403, "company-not-approved", "Your company’s marketplace access is not active, so inventory can’t be changed.");
  }

  // Claim the idempotency key before doing anything (SEC-009).
  const claim = await db
    .from("api_idempotency")
    .upsert(
      { org_id: key.org_id, idempotency_key: idempotencyKey, api_key_id: key.id, body_sha256: bodySha256 },
      { onConflict: "org_id,idempotency_key", ignoreDuplicates: true },
    )
    .select("org_id");
  if (claim.error) throw claim.error;
  if (!claim.data.length) {
    const { data: earlier } = await db
      .from("api_idempotency")
      .select("body_sha256, status_code, response")
      .eq("org_id", key.org_id)
      .eq("idempotency_key", idempotencyKey)
      .single();
    if (earlier?.body_sha256 !== bodySha256) {
      return problem(422, "idempotency-conflict", "This Idempotency-Key was already used for a different body. Use a new key for new data.");
    }
    if (earlier.status_code === null) {
      return problem(409, "in-progress", "The first request with this Idempotency-Key is still being applied. Try again in a moment.");
    }
    return Response.json(earlier.response, {
      status: earlier.status_code,
      headers: { "Idempotent-Replayed": "true", "Cache-Control": "no-store" },
    });
  }

  let status: number;
  let body: Json;
  try {
    const rows = parseInventory(new TextDecoder("utf-8").decode(bytes), {
      maxBytes: LIMITS.apiBytes,
      contentType: request.headers.get("content-type") ?? "",
    });
    const { data, error } = await db.rpc("service_apply_inventory", {
      target_org: key.org_id,
      src: "api",
      input: rows,
      api_key: key.id,
      run_label: `API ${idempotencyKey}`.slice(0, 200),
    });
    if (error) throw error;
    status = 200;
    body = data as Json;
  } catch (e) {
    if (!(e instanceof FormatError)) {
      // Nothing was applied: free the key so the same request can be retried.
      await db.from("api_idempotency").delete().eq("org_id", key.org_id).eq("idempotency_key", idempotencyKey);
      console.error("api inventory failed", { org: key.org_id, error: e instanceof Error ? e.message : e });
      return problem(500, "server-error", "Nilecruz couldn’t apply this request because of a problem on our side. Retry with the same Idempotency-Key.");
    }
    status = 422;
    body = { error: { code: "format", message: e.message } };
  }
  await Promise.all([
    db.from("api_idempotency").update({ status_code: status, response: body }).eq("org_id", key.org_id).eq("idempotency_key", idempotencyKey),
    db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id),
  ]);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

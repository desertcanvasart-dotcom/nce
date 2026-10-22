import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { safePost } from "@/lib/connections/safe-fetch";
import { signWebhook, verifyWebhook, webhookPublicKey } from "@/lib/connections/signature";
import { webhookBody, webhookProblem } from "@/lib/connections/webhooks";

const pem = generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }).toString();

describe("webhooks to operators (ADR-103)", () => {
  const delivery = {
    id: "8f9a1d2e-0000-4000-8000-000000000001",
    event: "inventory.changed",
    created_at: "2026-11-01T10:00:00Z",
    payload: { vessel: "sample-ship", date: "2026-12-01", cabin: "STD", available: 3 },
  };

  it("writes the event id, type, time and data", () => {
    expect(JSON.parse(webhookBody(delivery))).toEqual({
      id: delivery.id,
      type: "inventory.changed",
      created_at: "2026-11-01T10:00:00Z",
      data: delivery.payload,
    });
  });

  it("signs so an operator can check it with the published public key, and nothing else verifies", () => {
    const body = webhookBody(delivery);
    const now = 1_790_000_000;
    const headers = signWebhook(pem, delivery.id, body, now);
    const pub = webhookPublicKey(pem);
    expect(Buffer.from(pub, "base64")).toHaveLength(32);
    expect(verifyWebhook(pub, headers, body, now)).toBe(true);
    expect(verifyWebhook(pub, headers, body.replace('"available":3', '"available":4'), now)).toBe(false);
    expect(verifyWebhook(pub, headers, body, now + 600)).toBe(false);
  });

  it("says why a delivery didn't land", () => {
    expect(webhookProblem(302)).toMatch(/don't follow redirects/);
    expect(webhookProblem(500)).toBe("Your server answered 500; anything but 2xx is tried again.");
    expect(webhookProblem("unsafe")).toMatch(/public internet/);
    expect(webhookProblem("timeout")).toMatch(/10 seconds/);
  });

  it("never posts to a private or plain-http address", async () => {
    const o = { maxBytes: 1000, timeoutMs: 1000 };
    await expect(safePost("http://example.com/hook", "{}", o)).rejects.toMatchObject({ code: "address" });
    await expect(safePost("https://169.254.169.254/latest", "{}", o)).rejects.toMatchObject({ code: "address" });
    await expect(safePost("https://intranet.local/hook", "{}", o)).rejects.toMatchObject({ code: "address" });
  });
});

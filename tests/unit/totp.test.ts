import { describe, expect, it } from "vitest";
import { totp } from "../support/totp";

describe("test authenticator codes (RFC 6238)", () => {
  it("matches the RFC test vector for SHA-1", () => {
    // RFC 6238 appendix B: secret "12345678901234567890" (base32 below), T = 59 s → 94287082 (8 digits) → 287082 (6 digits).
    expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
    expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1_111_111_109_000)).toBe("081804");
  });
});

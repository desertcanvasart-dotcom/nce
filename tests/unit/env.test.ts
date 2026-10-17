import { describe, expect, it } from "vitest";
import { normaliseSiteUrl } from "@/lib/env";

describe("site URL from the environment (ENG-011)", () => {
  it("adds https:// when the scheme is missing, as Railway domains are often pasted", () => {
    expect(normaliseSiteUrl("nce-production-da4c.up.railway.app")).toBe("https://nce-production-da4c.up.railway.app");
  });
  it("keeps an explicit scheme and trims spaces", () => {
    expect(normaliseSiteUrl(" http://localhost:3000 ")).toBe("http://localhost:3000");
  });
  it("treats an empty value as unset", () => {
    expect(normaliseSiteUrl("")).toBeUndefined();
  });
});

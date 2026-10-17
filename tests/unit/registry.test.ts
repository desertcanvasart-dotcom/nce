import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ Link: () => null, usePathname: () => "/" }));

describe("gallery registry (ENG-007)", () => {
  it("has all 22 design-system components and matches the plain-data list used by e2e", async () => {
    const { registry } = await import("@/components/ds/registry");
    const { registryMeta } = await import("@/components/ds/registry-meta");
    expect(registry.filter((e) => e.ds)).toHaveLength(22);
    expect(
      registry.map((e) => ({
        name: e.name,
        group: e.group,
        ds: e.ds,
        stories: e.stories.length,
        parity: e.stories.some((s) => s.parity),
      })),
    ).toEqual(registryMeta);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyRefresh } from "@/lib/connections/signature";
import { refreshSite } from "../../scripts/lib/refresh-site";

const SECRET = "s".repeat(40);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("refreshSite (PERF-010, after a data import)", () => {
  it("posts a signed refresh to the target's site", async () => {
    vi.stubEnv("STAGING_SITE_URL", "https://staging.example.test");
    vi.stubEnv("STAGING_FEED_PULL_SECRET", SECRET);
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await refreshSite("staging")).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://staging.example.test/api/internal/catalogue/refresh/");
    const h = init.headers as Record<string, string>;
    expect(verifyRefresh(SECRET, h["nilecruz-timestamp"]!, h["nilecruz-signature"]!)).toBe(true);
  });

  it("defaults production to nilecruz.com", async () => {
    vi.stubEnv("PRODUCTION_FEED_PULL_SECRET", SECRET);
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await refreshSite("production");
    expect(String(fetch.mock.calls[0]![0])).toBe("https://nilecruz.com/api/internal/catalogue/refresh/");
  });

  it("only warns, without calling, when the secret isn't set or the site refuses", async () => {
    vi.stubEnv("PRODUCTION_FEED_PULL_SECRET", "");
    const fetch = vi.fn().mockResolvedValue(new Response("no", { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await refreshSite("production")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv("PRODUCTION_FEED_PULL_SECRET", SECRET);
    expect(await refreshSite("production")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("does nothing for the local database", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await refreshSite("local")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

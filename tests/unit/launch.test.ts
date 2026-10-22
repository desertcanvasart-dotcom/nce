import { describe, expect, it } from "vitest";
import { launchProblems } from "@/lib/launch/showcase";
import { securityHeaders } from "@/lib/security-headers";

describe("DATA-025 the launch showcase check", () => {
  it("passes when only real, published data is public", () => {
    expect(launchProblems({ vessels: [{ slug: "real-ship", visibility: "published", is_sample: false }], tours: [] })).toEqual(
      [],
    );
  });
  it("names every sample vessel or tour and every showcase exception", () => {
    expect(
      launchProblems({
        vessels: [
          { slug: "sample-sail-one", visibility: "published", is_sample: true },
          { slug: "preview-ship", visibility: "showcase", is_sample: false },
        ],
        tours: [{ slug: "sample-tour", is_sample: true }],
      }),
    ).toEqual([
      "Vessel sample-sail-one is sample data and visitors can see it.",
      "Vessel preview-ship is still a showcase exception: publish it properly or make it private.",
      "Tour sample-tour is sample data and visitors can see it.",
    ]);
  });
});

describe("ENG-014 the error tracker and the CSP", () => {
  const csp = (sentryDsn?: string) =>
    securityHeaders({ dev: false, https: true, supabaseUrl: "https://x.supabase.co", sentryDsn }).find(
      (h) => h.key === "Content-Security-Policy",
    )!.value;
  it("allows Sentry's ingest host only when a DSN is set", () => {
    expect(csp()).not.toContain("sentry");
    expect(csp("https://abc123@o1.ingest.de.sentry.io/42")).toContain(
      "connect-src 'self' https://x.supabase.co https://o1.ingest.de.sentry.io",
    );
  });
});

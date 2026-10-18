import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FormatError, LIMITS, parseInventory, priceToMinor } from "@/lib/connections/format";
import {
  canonicalRequest,
  generateApiKeyPair,
  pullSignature,
  sha256Hex,
  signRequest,
  signWebhook,
  verifyPull,
  verifyRequest,
  verifyWebhook,
} from "@/lib/connections/signature";
import {
  addressProblem,
  FetchProblem,
  isPublicAddress,
  pinnedLookup,
  safeFetch,
  urlProblem,
  type Resolver,
} from "@/lib/connections/safe-fetch";

const JSON_DOC = {
  format: "nilecruz-inventory/1",
  operator: { id: "op-1", name: "Sample operator" },
  cruises: [
    {
      id: "Sample-Steam-One",
      name: "Sample Steamer One",
      availability: [
        {
          date: "2027-03-15",
          schedule: "LXR-ASW",
          cabins: [
            {
              type: "STD",
              available: 4,
              confirmed_at: "2027-03-01T09:30:00+02:00",
              rates: [
                { occupancy: 2, plan: "international", currency: "USD", price: "1250.50" },
                { occupancy: 1, plan: "egyptian_citizen", currency: "EGP", price: 45000 },
              ],
            },
            { type: "STE", available: "0" },
          ],
        },
      ],
    },
  ],
};

const XML_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<feed format="nilecruz-inventory/1">
  <operator><id>op-1</id><name>Sample operator</name></operator>
  <cruises>
    <cruise>
      <id>sample-steam-one</id>
      <availability>
        <date date="2027-03-15" schedule="LXR-ASW">
          <cabin type="STD" available="4" confirmed_at="2027-03-01T07:30:00Z">
            <rate occupancy="2" plan="international" currency="USD" price="1250.50"/>
          </cabin>
        </date>
      </availability>
    </cruise>
  </cruises>
</feed>`;

describe("inventory format v1 (ADR-080)", () => {
  it("reads JSON into one row per sailing and cabin type, prices in minor units", () => {
    const rows = parseInventory(JSON.stringify(JSON_DOC));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      vessel: "sample-steam-one",
      date: "2027-03-15",
      schedule: "LXR-ASW",
      cabin: "STD",
      available: 4,
      confirmed_at: "2027-03-01T07:30:00.000Z",
      rates: [
        { occupancy: 2, plan: "international", currency: "USD", amount_minor: 125050 },
        { occupancy: 1, plan: "egyptian_citizen", currency: "EGP", amount_minor: 4500000 },
      ],
      errors: [],
    });
    expect(rows[1]).toMatchObject({ cabin: "STE", available: 0, rates: [], errors: [] });
  });

  it("reads the same data from XML", () => {
    const [row] = parseInventory(XML_DOC);
    expect(row).toMatchObject({
      vessel: "sample-steam-one",
      cabin: "STD",
      available: 4,
      confirmed_at: "2027-03-01T07:30:00.000Z",
    });
    expect(row!.rates).toEqual([{ occupancy: 2, plan: "international", currency: "USD", amount_minor: 125050 }]);
  });

  it("refuses XML with entity declarations: external entities and billion laughs (SEC-007)", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE feed [<!ENTITY x SYSTEM "file:///etc/passwd">]><feed><cruises><cruise><id>&x;</id></cruise></cruises></feed>`;
    const laughs = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;">]><feed>&lol2;</feed>`;
    expect(() => parseInventory(xxe)).toThrow(/DOCTYPE/);
    expect(() => parseInventory(laughs)).toThrow(FormatError);
    expect(() => parseInventory(`<?xml version="1.0"?>\n<!doctype feed SYSTEM "http://169.254.169.254/">\n<feed/>`)).toThrow(
      /DOCTYPE/,
    );
  });

  it("does not expand entity references it finds", () => {
    const rows = parseInventory(XML_DOC.replace("<id>sample-steam-one</id>", "<id>sample&amp;steam</id>"));
    expect(rows[0]!.errors.join(" ")).toMatch(/isn’t a vessel slug/);
  });

  it("refuses data over the size limit and too many rows", () => {
    expect(() => parseInventory(" ".repeat(LIMITS.pasteBytes + 1))).toThrow(/larger than 2 MB/);
    const many = {
      cruises: [
        {
          id: "a",
          availability: Array.from({ length: 2501 }, (_, i) => ({
            date: "2027-01-01",
            cabins: [
              { type: `C${i}`, available: 1 },
              { type: `D${i}`, available: 1 },
            ],
          })),
        },
      ],
    };
    expect(() => parseInventory(JSON.stringify(many), { maxBytes: 10_000_000 })).toThrow(/More than 5,000 rows/);
  });

  it("refuses documents that aren't the format", () => {
    expect(() => parseInventory("hello")).toThrow(/valid JSON or XML/);
    expect(() => parseInventory("<feed><cruises>")).toThrow(/valid XML/);
    expect(() => parseInventory(JSON.stringify({ format: "other/2", cruises: [] }))).toThrow(/Unknown format/);
    expect(() => parseInventory(JSON.stringify({ cruises: [] }))).toThrow(/No availability/);
    expect(() => parseInventory("[1,2]")).toThrow(/JSON object/);
  });

  it("explains each bad row and keeps the good ones", () => {
    const rows = parseInventory(
      JSON.stringify({
        cruises: [
          {
            id: "boat",
            availability: [
              { date: "2027-02-30", cabins: [{ type: "STD", available: 2 }] },
              {
                date: "2027-02-01",
                cabins: [
                  { type: "STD", available: -1 },
                  { type: "STD", available: 2.5 },
                ],
              },
              { date: "2027-02-02", cabins: [{ type: "STD", available: 1, confirmed_at: "2027-01-01 10:00" }] },
              {
                date: "2027-02-03",
                cabins: [{ type: "STD", available: 1, rates: [{ occupancy: 4, plan: "vip", currency: "GBP", price: "10.999" }] }],
              },
              { date: "2027-02-04", cabins: [{ type: "STD", available: 1, price: 900, currency: "USD" }] },
              { date: "2027-02-05", cabins: [{ type: "STD", available: 1 }] },
            ],
          },
        ],
      }),
    );
    expect(rows.map((r) => r.errors.length > 0)).toEqual([true, true, true, true, true, false, false]);
    expect(rows[0]!.errors[0]).toMatch(/isn’t a date/);
    expect(rows[1]!.errors[0]).toMatch(/whole number of cabins/);
    expect(rows[3]!.errors[0]).toMatch(/time with a time zone/);
    expect(rows[4]!.errors[0]).toMatch(/occupancy.*plan.*currency.*price/);
    expect(rows[5]!.warnings[0]).toMatch(/“price” was ignored/);
  });

  it("converts prices without floating point", () => {
    expect(priceToMinor("0.29")).toBe(29);
    expect(priceToMinor(1250.1)).toBe(125010);
    expect(priceToMinor("12,50")).toBeNull();
    expect(priceToMinor("1e3")).toBeNull();
    expect(priceToMinor("0")).toBeNull();
  });
});

describe("signed API requests (SEC-008, SEC-009, ADR-085)", () => {
  const keys = generateApiKeyPair();
  const body = JSON.stringify(JSON_DOC);
  const now = 1_800_000_000;
  const parts = {
    method: "POST",
    path: "/api/v1/inventory/",
    timestamp: String(now),
    idempotencyKey: "req-0001-abcd",
    bodySha256: sha256Hex(body),
  };

  it("stores a 32-byte public key and gives a PEM private key", () => {
    expect(Buffer.from(keys.publicKey, "base64")).toHaveLength(32);
    expect(keys.publicKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(keys.privateKeyPem).toMatch(/^-----BEGIN PRIVATE KEY-----/);
  });

  it("accepts a valid signature", () => {
    expect(verifyRequest(keys.publicKey, signRequest(keys.privateKeyPem, parts), parts, now + 10)).toEqual({ ok: true });
  });

  it("refuses an expired or future timestamp", () => {
    const sig = signRequest(keys.privateKeyPem, parts);
    expect(verifyRequest(keys.publicKey, sig, parts, now + 301)).toEqual({ ok: false, reason: "expired" });
    expect(verifyRequest(keys.publicKey, sig, parts, now - 301)).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses a tampered body, path, idempotency key or timestamp", () => {
    const sig = signRequest(keys.privateKeyPem, parts);
    for (const changed of [
      { ...parts, bodySha256: sha256Hex(body.replace("4", "9")) },
      { ...parts, path: "/api/v1/other/" },
      { ...parts, idempotencyKey: "req-0002-abcd" },
      { ...parts, timestamp: String(now + 1) },
    ]) {
      expect(verifyRequest(keys.publicKey, sig, changed, now)).toEqual({ ok: false, reason: "bad-signature" });
    }
  });

  it("refuses another company's key", () => {
    const other = generateApiKeyPair();
    expect(verifyRequest(other.publicKey, signRequest(keys.privateKeyPem, parts), parts, now)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("a replayed request verifies, so replays are stopped by the idempotency key (tested end to end)", () => {
    const sig = signRequest(keys.privateKeyPem, parts);
    expect(verifyRequest(keys.publicKey, sig, parts, now + 60)).toEqual({ ok: true });
    expect(canonicalRequest(parts).split("\n")).toEqual([
      "nilecruz-v1",
      "POST",
      "/api/v1/inventory/",
      String(now),
      "req-0001-abcd",
      parts.bodySha256,
    ]);
  });

  it("refuses malformed headers", () => {
    expect(verifyRequest(keys.publicKey, "not base64!", parts, now).ok).toBe(false);
    expect(
      verifyRequest(keys.publicKey, signRequest(keys.privateKeyPem, parts), { ...parts, idempotencyKey: "short" }, now),
    ).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("signs the scheduler's pull with a shared secret", () => {
    const secret = "test-secret-not-real-0123456789";
    const ts = String(now);
    expect(verifyPull(secret, ts, pullSignature(secret, ts), now)).toBe(true);
    expect(verifyPull(secret, ts, pullSignature("other", ts), now)).toBe(false);
    expect(verifyPull(secret, ts, pullSignature(secret, ts), now + 400)).toBe(false);
  });

  it("signs outbound webhooks the same way (SEC-009)", () => {
    const platform = generateApiKeyPair();
    const payload = JSON.stringify({ event: "booking.requested" });
    const headers = signWebhook(platform.privateKeyPem, "evt_1", payload, now);
    expect(verifyWebhook(platform.publicKey, headers, payload, now + 5)).toBe(true);
    expect(verifyWebhook(platform.publicKey, headers, payload.replace("requested", "paid"), now + 5)).toBe(false);
    expect(verifyWebhook(platform.publicKey, headers, payload, now + 1000)).toBe(false);
  });
});

describe("feed fetching (SEC-007)", () => {
  it("blocks private, internal and metadata addresses", () => {
    for (const a of [
      "127.0.0.1",
      "127.8.9.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
    ])
      expect(isPublicAddress(a), a).toBe(false);
    for (const a of [
      "::1",
      "::",
      "fe80::1",
      "fd00::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "::ffff:a9fe:a9fe",
      "64:ff9b::7f00:1",
      "2002:7f00:1::",
    ])
      expect(isPublicAddress(a), a).toBe(false);
    for (const a of ["93.184.215.14", "8.8.8.8", "2606:4700:4700::1111", "::ffff:8.8.8.8"])
      expect(isPublicAddress(a), a).toBe(true);
  });

  it("checks the address before any network use", () => {
    expect(urlProblem("http://feeds.example.com/x")).toMatch(/https/);
    expect(urlProblem("https://user:pw@feeds.example.com/x")).toMatch(/user name/);
    expect(urlProblem("https://feeds.example.com:22/x")).toMatch(/port/);
    expect(urlProblem("https://localhost/x")).toMatch(/private/);
    expect(urlProblem("https://printer.local/x")).toMatch(/private/);
    expect(urlProblem("https://metadata.google.internal/x")).toMatch(/private/);
    expect(urlProblem("https://169.254.169.254/latest/meta-data/")).toMatch(/private/);
    expect(urlProblem("https://[::1]/x")).toMatch(/private/);
    // Numeric spellings of 127.0.0.1 are normalised by the URL parser and still caught.
    expect(urlProblem("https://2130706433/x")).toMatch(/private/);
    expect(urlProblem("https://0x7f.1/x")).toMatch(/private/);
    expect(urlProblem("https://feeds.example.com/inventory.xml")).toBeNull();
  });

  it("checks what a name resolves to when the address is saved", async () => {
    const toLoopback: Resolver = async () => [{ address: "127.0.0.1", family: 4 }];
    const mixed: Resolver = async () => [
      { address: "93.184.215.14", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ];
    expect(await addressProblem("https://sneaky.example.com/", {}, toLoopback)).toMatch(/private/);
    expect(await addressProblem("https://sneaky.example.com/", {}, mixed)).toMatch(/private/);
    expect(await addressProblem("https://ok.example.com/", {}, async () => [{ address: "93.184.215.14", family: 4 }])).toBeNull();
  });

  it("checks again inside the connection's own lookup, so DNS rebinding can't slip through", async () => {
    let calls = 0;
    // Public for the first answer (as when the address was saved), loopback afterwards.
    const rebinding: Resolver = async () =>
      calls++ === 0 ? [{ address: "93.184.215.14", family: 4 }] : [{ address: "127.0.0.1", family: 4 }];
    expect(await addressProblem("https://rebind.example.com/", {}, rebinding)).toBeNull();
    const err = await safeFetch("https://rebind.example.com/feed.xml", {
      maxBytes: 1000,
      timeoutMs: 2000,
      resolve: rebinding,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(FetchProblem);
    expect((err as FetchProblem).code).toBe("unsafe");
    const v6: Resolver = async () => [{ address: "::1", family: 6 }];
    await new Promise<void>((done) =>
      pinnedLookup(v6)("x.example.com", { all: true }, (e) => {
        expect((e as FetchProblem).code).toBe("unsafe");
        done();
      }),
    );
  });

  describe("against a local test server", () => {
    let server: http.Server;
    let origin = "";
    beforeAll(async () => {
      server = http.createServer((req, res) => {
        if (req.url === "/ok") return res.end(XML_DOC);
        if (req.url === "/big") return res.end("x".repeat(5000));
        if (req.url === "/slow") return setTimeout(() => res.end("late"), 3000);
        if (req.url === "/to-metadata") return res.writeHead(302, { Location: "http://169.254.169.254/latest/" }).end();
        if (req.url === "/loop") return res.writeHead(302, { Location: "/loop" }).end();
        if (req.url === "/gzip") return res.writeHead(200, { "Content-Encoding": "gzip" }).end("…");
        res.writeHead(404).end();
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise<void>((r) => server.close(() => r())));
    const opts = () => ({ maxBytes: 1000, timeoutMs: 1000, policy: { testOrigins: [origin] } });

    it("refuses the local server unless it is an allowed test origin", async () => {
      const err = await safeFetch(`${origin}/ok`, { maxBytes: 10_000, timeoutMs: 1000 }).catch((e) => e);
      expect((err as FetchProblem).code).toBe("address");
      const r = await safeFetch(`${origin}/ok`, { ...opts(), maxBytes: 10_000 });
      expect(r.body).toContain("sample-steam-one");
    });

    it("re-checks every redirect", async () => {
      const err = await safeFetch(`${origin}/to-metadata`, opts()).catch((e) => e);
      expect(err).toMatchObject({ code: "unsafe" });
      expect(String(err.message)).toMatch(/redirected/);
      expect(await safeFetch(`${origin}/loop`, opts()).catch((e) => e.code)).toBe("redirects");
    });

    it("enforces the size and time limits and refuses compressed answers", async () => {
      expect(await safeFetch(`${origin}/big`, opts()).catch((e) => e.code)).toBe("too-large");
      expect(await safeFetch(`${origin}/slow`, opts()).catch((e) => e.code)).toBe("timeout");
      expect(await safeFetch(`${origin}/gzip`, opts()).catch((e) => e.code)).toBe("network");
      expect(await safeFetch(`${origin}/missing`, opts()).catch((e) => e.message)).toMatch(/error 404 \(Not Found\)/);
    });
  });
});

describe("data age in words (DASH-OPR-027)", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  it("reads naturally", async () => {
    const { ageInWords } = await import("@/lib/connections/age");
    expect(ageInWords(null, now)).toBe("No data yet");
    expect(ageInWords("2026-10-18T11:59:40Z", now)).toBe("Just now");
    expect(ageInWords("2026-10-18T11:15:00Z", now)).toBe("45 min ago");
    expect(ageInWords("2026-10-18T09:30:00Z", now)).toBe("2 h 30 min ago");
    expect(ageInWords("2026-10-17T12:00:00Z", now)).toBe("24 h ago");
    expect(ageInWords("2026-10-10T12:00:00Z", now)).toBe("8 days ago");
  });
});

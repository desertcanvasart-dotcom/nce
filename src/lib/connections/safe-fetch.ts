import http from "node:http";
import https from "node:https";
import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";

/**
 * Fetching addresses that operators give us (SEC-007). Unchecked, a "feed" at http://169.254.169.254/ (the cloud
 * metadata service) or http://localhost would be fetched with our server's own reach, and the answer would come
 * back to the operator in their feed log.
 *
 * - https only, on port 443 or 8443, with no user name or password in the address;
 * - every address the name resolves to must be public, checked when the connection is made, inside the lookup
 *   that the connection itself uses. Checking first and connecting afterwards would allow DNS rebinding: a name
 *   that answers with a public address for the check and a private one for the connection;
 * - redirects are followed by hand (at most three) and every hop is checked again;
 * - a size limit and an overall time limit; compressed answers are refused (no decompression bombs).
 */

export type FetchProblemCode = "address" | "unsafe" | "dns" | "timeout" | "too-large" | "http" | "tls" | "network" | "redirects";

export class FetchProblem extends Error {
  constructor(
    readonly code: FetchProblemCode,
    message: string,
  ) {
    super(message);
  }
}

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const)
  blocked.addSubnet(net, prefix, "ipv4");
// IPv4-mapped addresses (::ffff:a.b.c.d) are converted and checked as IPv4 in isPublicAddress: a ::ffff:0:0/96
// rule here would also match every plain IPv4 address, because BlockList checks IPv4 against mapped rules.
for (const [net, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64: reaches IPv4 through a gateway
  ["64:ff9b:1::", 48],
  ["100::", 64], // discard
  ["2001::", 23], // IETF protocol assignments, Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4: embeds an IPv4 address
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // old site-local
  ["ff00::", 8], // multicast
] as const)
  blocked.addSubnet(net, prefix, "ipv6");

function mappedIpv4(v6: string): string | null {
  const v = v6.toLowerCase();
  const dotted = v.match(/^(?:0{0,4}:){0,5}:?ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1]!;
  const hex = v.match(/^(?:0{0,4}:){0,5}:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const hi = parseInt(hex[1]!, 16);
  const lo = parseInt(hex[2]!, 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** True only for addresses on the public internet. */
export function isPublicAddress(address: string): boolean {
  const a = address.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const family = isIP(a);
  if (family === 4) return !blocked.check(a, "ipv4");
  if (family === 6) {
    const v4 = mappedIpv4(a);
    if (v4) return isPublicAddress(v4);
    return !blocked.check(a, "ipv6");
  }
  return false;
}

export type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
export const systemResolver: Resolver = (host) => dns.lookup(host, { all: true, verbatim: true });

/**
 * Exact origins (e.g. "https://127.0.0.1:55499") that the end-to-end tests' local feed server uses. They are only
 * honoured when the app runs against a local database (see server/connections/policy.ts), never on staging.
 */
export type FetchPolicy = { testOrigins?: string[]; ca?: string };

const LOCAL_NAME = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/i;

function isTestOrigin(url: URL, policy: FetchPolicy) {
  return !!policy.testOrigins?.includes(url.origin);
}

/** Checks that need no network: shape, scheme, port, credentials, names and literal addresses. */
export function urlProblem(raw: string, policy: FetchPolicy = {}): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "That isn’t a complete web address. It should start with https://";
  }
  if (isTestOrigin(url, policy)) return null;
  if (url.protocol !== "https:") return "Use an address that starts with https:// (encrypted).";
  if (url.username || url.password) return "Leave the user name and password out of the address.";
  if (url.port && url.port !== "443" && url.port !== "8443") return "Use the standard https port (443, or 8443).";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host) ? null : "That address is on a private or internal network.";
  if (!host.includes(".") || LOCAL_NAME.test(host)) return "That address is on a private or internal network.";
  return null;
}

/** For saving a feed address: the checks above plus a DNS lookup now (it is checked again on every pull). */
export async function addressProblem(
  raw: string,
  policy: FetchPolicy = {},
  resolve: Resolver = systemResolver,
): Promise<string | null> {
  const p = urlProblem(raw, policy);
  if (p) return p;
  const url = new URL(raw);
  if (isTestOrigin(url, policy) || isIP(url.hostname.replace(/^\[|\]$/g, ""))) return null;
  try {
    const addrs = await resolve(url.hostname);
    if (!addrs.length) return "That address could not be found.";
    if (addrs.some((a) => !isPublicAddress(a.address))) return "That address is on a private or internal network.";
  } catch {
    return "That address could not be found.";
  }
  return null;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | { address: string; family: number }[],
  family?: number,
) => void;

/** The lookup the connection itself uses: refuses private answers, so what is checked is what is connected to. */
export function pinnedLookup(resolve: Resolver) {
  return (hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    resolve(hostname).then(
      (addrs) => {
        if (!addrs.length) return callback(new FetchProblem("dns", "The feed address could not be found."), "");
        if (addrs.some((a) => !isPublicAddress(a.address))) {
          return callback(
            new FetchProblem("unsafe", "The feed address points to a private or internal network, so it is not fetched."),
            "",
          );
        }
        if (options.all) callback(null, addrs);
        else callback(null, addrs[0]!.address, addrs[0]!.family);
      },
      () => callback(new FetchProblem("dns", "The feed address could not be found."), ""),
    );
  };
}

export type FetchOptions = {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects?: number;
  policy?: FetchPolicy;
  resolve?: Resolver;
  headers?: Record<string, string>;
  /** POST sends `body` (webhooks, ADR-103); GET by default. */
  method?: "GET" | "POST";
  body?: string;
};
export type Fetched = { url: string; status: number; contentType: string; body: string };

const TLS_CODES = /CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS|ERR_SSL/;

function once(
  target: URL,
  o: FetchOptions,
  deadline: number,
): Promise<{ status: number; location: string | null; contentType: string; body: string }> {
  const policy = o.policy ?? {};
  const test = isTestOrigin(target, policy);
  const lib = target.protocol === "http:" ? http : https;
  return new Promise((resolvePromise, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      return reject(
        new FetchProblem("timeout", `The feed took longer than ${Math.round(o.timeoutMs / 1000)} seconds to answer.`),
      );
    const req = lib.request(
      target,
      {
        method: o.method ?? "GET",
        headers: {
          "User-Agent": "Nilecruz-FeedPuller/1.0",
          Accept: "application/json, application/xml, text/xml",
          "Accept-Encoding": "identity",
          ...(o.body !== undefined ? { "Content-Length": String(Buffer.byteLength(o.body)) } : {}),
          ...o.headers,
        },
        // Test origins skip the address check (they are local by design) and may use the test CA.
        lookup: test ? undefined : (pinnedLookup(o.resolve ?? systemResolver) as never),
        ...(test && policy.ca ? { ca: policy.ca } : {}),
        agent: false,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolvePromise({ status, location: res.headers.location ?? null, contentType: "", body: "" });
        }
        const encoding = (res.headers["content-encoding"] ?? "identity").toLowerCase();
        if (encoding !== "identity") {
          req.destroy(new FetchProblem("network", "The feed server sent a compressed answer. Serve it uncompressed."));
          return;
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > o.maxBytes) {
          req.destroy(new FetchProblem("too-large", `The feed is larger than ${Math.round(o.maxBytes / 1_000_000)} MB.`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > o.maxBytes)
            req.destroy(new FetchProblem("too-large", `The feed is larger than ${Math.round(o.maxBytes / 1_000_000)} MB.`));
          else chunks.push(c);
        });
        res.on("end", () =>
          resolvePromise({
            status,
            location: null,
            contentType: String(res.headers["content-type"] ?? ""),
            body: new TextDecoder("utf-8").decode(Buffer.concat(chunks)),
          }),
        );
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () =>
        req.destroy(
          new FetchProblem("timeout", `The feed took longer than ${Math.round(o.timeoutMs / 1000)} seconds to answer.`),
        ),
      remaining,
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (e instanceof FetchProblem) return reject(e);
      if (e.code && TLS_CODES.test(e.code))
        return reject(new FetchProblem("tls", "The feed’s security certificate could not be verified."));
      if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN")
        return reject(new FetchProblem("dns", "The feed address could not be found."));
      if (e.code === "ECONNREFUSED") return reject(new FetchProblem("network", "The feed server refused the connection."));
      reject(new FetchProblem("network", "The feed server could not be reached."));
    });
    req.end(o.body);
  });
}

/** GET an operator-supplied address within the limits above. Throws FetchProblem with a message in plain words. */
export async function safeFetch(raw: string, o: FetchOptions): Promise<Fetched> {
  const deadline = Date.now() + o.timeoutMs;
  let current = raw;
  for (let hop = 0; ; hop++) {
    const problem = urlProblem(current, o.policy);
    if (problem)
      throw new FetchProblem(
        hop === 0 ? "address" : "unsafe",
        hop === 0 ? problem : `The feed redirected to an address that is not allowed: ${problem}`,
      );
    const r = await once(new URL(current), o, deadline);
    if (r.location !== null) {
      if (hop >= (o.maxRedirects ?? 3)) throw new FetchProblem("redirects", "The feed redirected too many times.");
      current = new URL(r.location, current).toString();
      continue;
    }
    if (r.status >= 300 && r.status < 400)
      throw new FetchProblem("http", `The feed server answered ${r.status} without a new address.`);
    if (r.status !== 200)
      throw new FetchProblem(
        "http",
        `The feed server answered with error ${r.status}${http.STATUS_CODES[r.status] ? ` (${http.STATUS_CODES[r.status]})` : ""}.`,
      );
    return { url: current, status: r.status, contentType: r.contentType, body: r.body };
  }
}

/**
 * POST to an operator-supplied address (webhooks, ADR-103), with the same address checks on the connection. Redirects
 * are not followed: a 3xx is returned like any other answer, and the caller treats it as not delivered.
 */
export async function safePost(
  raw: string,
  body: string,
  o: Omit<FetchOptions, "method" | "body" | "maxRedirects">,
): Promise<number> {
  const problem = urlProblem(raw, o.policy);
  if (problem) throw new FetchProblem("address", problem);
  const r = await once(new URL(raw), { ...o, method: "POST", body }, Date.now() + o.timeoutMs);
  return r.status;
}

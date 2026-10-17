/**
 * SEC-003 / ENG-016: after `pnpm build`, scan everything the browser can download (.next/static)
 * for secret keys or server-only names. Run after `pnpm build`; CI fails on any match.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dir = join(root, ".next/static");
if (!existsSync(dir)) {
  console.error("No build found. Run `pnpm build` first.");
  process.exit(1);
}

const PATTERNS: [string, RegExp][] = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["service_role JWT", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl/],
  ["Supabase personal access token", /sbp_[a-f0-9]{30,}/],
  ["server env name", /SUPABASE_SECRET_KEY|SUPABASE_ACCESS_TOKEN|SANITY_API_WRITE_TOKEN/],
  ["admin client module", /getAdminDb/],
];

const walk = (d: string, out: string[] = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|css|html|json|txt|map)$/.test(p)) out.push(p);
  }
  return out;
};

const hits: string[] = [];
for (const file of walk(dir)) {
  const text = readFileSync(file, "utf8");
  for (const [label, re] of PATTERNS) if (re.test(text)) hits.push(`${relative(root, file)}: ${label}`);
}

if (hits.length) {
  console.error(hits.join("\n"));
  console.error(`\n${hits.length} secret-like match(es) in the client bundle.`);
  process.exit(1);
}
console.log(`Client bundle secret check: ${walk(dir).length} files, no matches.`);

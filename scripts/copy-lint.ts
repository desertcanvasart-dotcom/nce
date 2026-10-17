/**
 * Copy lint (BRAND-001, BRAND-002): UI copy in message files and JSX text must not contain
 *  - "best", "unbeatable" or "once in a lifetime" ("best for" is allowed: the guide's editorial
 *    "Best for" labels, Q57);
 *  - exclamation marks (ASCII or full-width) or emoji.
 * Run: pnpm lint:copy
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { lintText, type CopyProblem } from "../src/lib/copy-rules";

const root = resolve(import.meta.dirname, "..");
const problems: (CopyProblem & { file: string; where: string })[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function flatten(obj: unknown, prefix = ""): [string, string][] {
  if (typeof obj === "string") return [[prefix, obj]];
  if (obj && typeof obj === "object")
    return Object.entries(obj).flatMap(([k, v]) => (k.startsWith("_") ? [] : flatten(v, prefix ? `${prefix}.${k}` : k)));
  return [];
}

for (const file of walk(join(root, "messages")).filter((f) => f.endsWith(".json"))) {
  for (const [key, text] of flatten(JSON.parse(readFileSync(file, "utf8")))) {
    for (const p of lintText(text)) problems.push({ ...p, file: relative(root, file), where: key });
  }
}

// JSX text between tags in pages and components (comments and code are skipped).
for (const file of walk(join(root, "src")).filter((f) => f.endsWith(".tsx"))) {
  const src = readFileSync(file, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  // "(?<![=-])>" skips the ">" of arrow functions (=>) and comparisons, which are code, not tag ends.
  for (const m of src.matchAll(/(?<![=-])>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const text = m[1]!.trim();
    if (!text || /[=;]\s*$/.test(text) || /^\s*\)/.test(text)) continue;
    const line = src.slice(0, m.index).split("\n").length;
    for (const p of lintText(text)) problems.push({ ...p, file: relative(root, file), where: `line ${line}` });
  }
}

if (problems.length) {
  for (const p of problems) console.error(`${p.file} (${p.where}): ${p.rule}: "${p.match}"`);
  console.error(`\n${problems.length} copy problem(s).`);
  process.exit(1);
}
console.log("Copy lint: no problems.");

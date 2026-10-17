/**
 * Generates src/styles/tokens.css and src/styles/tokens.ts from the design-system
 * token source (vendor/design-system/tokens/tokens.json) plus tokens/motion.json.
 * Token names are the contract (CLAUDE.md §6). Never edit the outputs by hand.
 *
 *   pnpm tokens         write the files
 *   pnpm tokens:check   fail if the files are missing, stale or hand-edited (TOK-PIPELINE)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildTokens } from "../src/styles/build-tokens";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(readFileSync(resolve(root, "vendor/design-system/tokens/tokens.json"), "utf8"));
const motion = JSON.parse(readFileSync(resolve(root, "tokens/motion.json"), "utf8"));

const { css, ts } = buildTokens(source, motion);
const outputs: [string, string][] = [
  [resolve(root, "src/styles/tokens.css"), css],
  [resolve(root, "src/styles/tokens.ts"), ts],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([file, text]) => !existsSync(file) || readFileSync(file, "utf8") !== text);
  if (stale.length) {
    console.error(`Token files are stale or were edited by hand: ${stale.map(([f]) => f).join(", ")}\nRun: pnpm tokens`);
    process.exit(1);
  }
  console.log("Tokens are up to date.");
} else {
  for (const [file, text] of outputs) writeFileSync(file, text);
  console.log(`Wrote ${outputs.length} token files.`);
}

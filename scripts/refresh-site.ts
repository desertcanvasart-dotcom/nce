/**
 * Shows a data change on the site at once (PERF-010), for changes made outside the app:
 *   pnpm refresh:site --target=staging
 *   pnpm refresh:site --target=production
 * The import scripts do this themselves after --apply; see scripts/lib/refresh-site.ts for the settings it needs.
 */
import { refreshSite } from "./lib/refresh-site";

const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1];
if (target !== "staging" && target !== "production") {
  console.error("Say where: --target=staging or --target=production.");
  process.exit(1);
}
refreshSite(target).then((ok) => process.exit(ok ? 0 : 1));

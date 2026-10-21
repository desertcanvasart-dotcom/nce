import { test } from "@playwright/test";
import { BUILT } from "@/lib/seo/links";
import { EXTRA_PAGES } from "@/lib/seo/sitemap";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

/**
 * A11Y-011 (Batch 11): no serious or critical axe issue on any built public page, in Day and Night. Runs once, in the
 * production-settings pass (not again with the dev routes on).
 */
test.skip(process.env.ENABLE_DEV_ROUTES === "true", "runs once, in the production-settings pass");
test.describe.configure({ mode: "parallel" });

for (const theme of ["light", "dark"] as const) {
  for (const path of [...BUILT, ...EXTRA_PAGES]) {
    test(`${path} in ${theme === "light" ? "Day" : "Night"} [A11Y-011]`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(path);
      await expectNoSeriousA11yIssues(page);
    });
  }
}

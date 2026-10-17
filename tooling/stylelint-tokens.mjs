/**
 * TOK-NO-HARDCODE: in component and page styles, a value that has a design token must use it.
 * - colours: never hex, rgb()/hsl() or named colours (use var(--…));
 * - border-radius, box-shadow, font-family: var(--…) only (or 0 / none / inherit);
 * - spacing and font-size: a literal equal to a token value (e.g. 24px = --space-5) is an error.
 * Token values are read from the vendored tokens.json, so the rule follows the source of truth.
 */
import stylelint from "stylelint";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ruleName = "nilecruz/use-tokens";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (prop, value, hint) => `"${prop}: ${value}" ${hint}`,
});

const source = JSON.parse(
  readFileSync(fileURLToPath(new URL("../vendor/design-system/tokens/tokens.json", import.meta.url)), "utf8"),
);
const spaceValues = new Map(source.spacing.tokens.map((t) => [t.value, t.name]));
const fontSizes = new Map(source.type.groups.flatMap((g) => g.styles.map((s) => [s.fontSize, `type-${s.name}-size`])));

const SPACING = /^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/;
const VAR_ONLY = /^(border-radius|box-shadow|font-family)$/;
const SAFE = /^(0|none|inherit|initial|unset|currentcolor|transparent)$/i;
const COLOR_FN = /\b(rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(/i;
const HEX = /#[0-9a-f]{3,8}\b/i;
const NAMED = /(^|[\s,(])(white|black|red|blue|green|gray|grey|navy|gold|ivory|beige|tan|silver)($|[\s,)])/i;

const plugin = stylelint.createPlugin(ruleName, (enabled) => (root, result) => {
  if (!enabled) return;
  root.walkDecls((decl) => {
    const { prop, value } = decl;
    if (prop.startsWith("--")) return; // defining custom properties is the token file's job
    const report = (hint) =>
      stylelint.utils.report({ ruleName, result, node: decl, message: messages.rejected(prop, value, hint) });

    if (HEX.test(value) || COLOR_FN.test(value) || NAMED.test(value)) return report("uses a raw colour; use a colour token.");
    if (VAR_ONLY.test(prop) && !SAFE.test(value.trim()) && !/^var\(--/.test(value.trim()))
      return report("must use a token (radius-*, shadow-*, font-*).");
    if (SPACING.test(prop)) {
      for (const part of value.split(/\s+/)) {
        const token = spaceValues.get(part);
        if (token) return report(`should use var(--${token}).`);
      }
    }
    if (prop === "font-size") {
      const token = fontSizes.get(value.trim());
      if (token) return report(`should use var(--${token}).`);
    }
  });
});

const tokensPlugin = { ...plugin, ruleName, messages };
export default tokensPlugin;

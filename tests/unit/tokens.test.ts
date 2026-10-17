import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTokens, fontStack, responsiveSize, type MotionSource, type TokenSource } from "@/styles/build-tokens";

const root = resolve(import.meta.dirname, "../..");
const source: TokenSource = JSON.parse(readFileSync(resolve(root, "vendor/design-system/tokens/tokens.json"), "utf8"));
const motion: MotionSource = JSON.parse(readFileSync(resolve(root, "tokens/motion.json"), "utf8"));
const { css } = buildTokens(source, motion);

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
};

describe("token pipeline (TOK-*)", () => {
  it("emits every colour token with its Day value, and every themed one with its Night value", () => {
    const light = block('[data-theme="light"]');
    const dark = block('[data-theme="dark"]');
    for (const t of source.color.tokens) {
      if (typeof t.value === "string") expect(light).toContain(`--${t.name}: ${t.value};`);
      else {
        expect(light).toContain(`--${t.name}: ${t.value.light};`);
        expect(dark).toContain(`--${t.name}: ${t.value.dark};`);
      }
    }
    expect(source.color.tokens).toHaveLength(31); // 19 semantic + 12 palette
  });

  it("emits spacing, radius, layout and themed shadows", () => {
    for (const g of [source.spacing, source.radius, source.layout])
      for (const t of g.tokens) expect(css).toContain(`--${t.name}: ${t.value};`);
    for (const t of source.shadow.tokens) {
      if (typeof t.value !== "string") {
        expect(block('[data-theme="light"]')).toContain(`--${t.name}: ${t.value.light};`);
        expect(block('[data-theme="dark"]')).toContain(`--${t.name}: ${t.value.dark};`);
      }
    }
  });

  it("emits the motion tokens added by ADR-016", () => {
    expect(css).toContain("--ease-river: cubic-bezier(.22, .61, .36, 1);");
    expect(css).toContain("--dur-1: 160ms;");
    expect(css).toContain("--dur-2: 320ms;");
    expect(css).toContain("--dur-3: 640ms;");
  });

  it("emits a class and variables for all 12 type styles, with display-xl dropping to 56px under 720px", () => {
    const styles = source.type.groups.flatMap((g) => g.styles);
    expect(styles).toHaveLength(12);
    for (const s of styles) {
      expect(css).toContain(`.${s.name} {`);
      expect(css).toContain(`--type-${s.name}-size: ${s.fontSize};`);
    }
    expect(css).toMatch(/@media \(max-width: 720px\) \{\s*:root \{ --type-display-xl-size: 56px; \}/);
  });

  it("keeps the font stack order and points self-hosted faces at next/font variables", () => {
    expect(fontStack('"Cormorant Garamond", "Cormorant", "Noto Serif JP", Georgia, serif')).toBe(
      'var(--font-face-cormorant, "Cormorant Garamond"), "Cormorant", var(--font-face-noto-serif-jp, "Noto Serif JP"), Georgia, serif',
    );
  });

  it("reads responsive sizes only from the usage text", () => {
    expect(responsiveSize("Hero headline only. Drops to 56px under 720px.")).toEqual({ size: "56px", below: "720px" });
    expect(responsiveSize("Page titles.")).toBeNull();
  });

  it("matches the generated file on disk (TOK-PIPELINE)", () => {
    expect(readFileSync(resolve(root, "src/styles/tokens.css"), "utf8")).toBe(css);
  });
});

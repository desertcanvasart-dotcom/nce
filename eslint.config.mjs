import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // eslint-config-next already registers jsx-a11y; turn on its strict rule set (A11Y).
      ...jsxA11y.flatConfigs.strict.rules,
      // ENG-004: suppressions need a written reason.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true, "ts-nocheck": true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-syntax": [
        "error",
        {
          // ENG-016/SEC-003: the secret key must never be read in client-reachable code.
          selector: "MemberExpression[object.object.name='process'][property.name=/SECRET|SERVICE_ROLE/]",
          message: "Secret keys may only be read in server-only modules (src/server/**).",
        },
      ],
    },
  },
  {
    // Server-only modules (guarded by `import "server-only"`), scripts and tests (never shipped) may read secrets.
    files: ["src/server/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // ENG-016/SEC-003: browser-reachable code never imports server modules or the admin (RLS-bypassing) client.
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}", "src/i18n/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "**/server/**"],
              message: "Components and shared libs must not import server code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/proxy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/server/db/admin", message: "The admin client bypasses RLS: use getDb() in routes and pages." }],
        },
      ],
    },
  },
  {
    // ENG-004: an eslint-disable comment must say why ("-- reason").
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: {
      local: {
        rules: {
          // SEC-002: every exported server action starts from an authorisation guard (or says it is for anonymous visitors).
          "server-action-guard": {
            meta: { type: "problem", schema: [] },
            create(context) {
              const GUARDS = new Set(["requireUser", "requireAdmin", "requireOrgRole", "requireProductEditor", "allowAnonymous"]);
              const isServerFile = context.sourceCode.ast.body.some(
                (n) => n.type === "ExpressionStatement" && n.directive === "use server",
              );
              const callsGuard = (node) => {
                let found = false;
                const visit = (n) => {
                  if (!n || typeof n !== "object" || found) return;
                  if (n.type === "CallExpression" && n.callee.type === "Identifier" && GUARDS.has(n.callee.name)) found = true;
                  for (const k of Object.keys(n)) {
                    if (k === "parent") continue;
                    const v = n[k];
                    if (Array.isArray(v)) v.forEach(visit);
                    else if (v && typeof v.type === "string") visit(v);
                  }
                };
                visit(node.body);
                return found;
              };
              return {
                ExportNamedDeclaration(node) {
                  if (!isServerFile) return;
                  const d = node.declaration;
                  if (d?.type === "FunctionDeclaration" && !callsGuard(d)) {
                    context.report({
                      node: d,
                      message: "Server actions must call requireUser/requireAdmin/requireOrgRole or allowAnonymous().",
                    });
                  }
                },
              };
            },
          },
          "disable-needs-reason": {
            meta: { type: "problem", schema: [] },
            create(context) {
              return {
                Program() {
                  for (const c of context.sourceCode.getAllComments()) {
                    if (/eslint-disable/.test(c.value) && !/--\s*\S/.test(c.value)) {
                      context.report({ loc: c.loc, message: "eslint-disable needs a reason after '--'." });
                    }
                  }
                },
              };
            },
          },
        },
      },
    },
    rules: { "local/disable-needs-reason": "error", "local/server-action-guard": "error" },
  },
  globalIgnores([
    ".next/**",
    // Other sessions' git worktrees (Claude Code) hold whole copies of the repository, builds included.
    ".claude/**",
    "node_modules/**",
    "vendor/**",
    "next-env.d.ts",
    "supabase/.temp/**",
    "studio/node_modules/**",
    "studio/dist/**",
    "studio/.sanity/**",
    "supabase/.branches/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
    "src/styles/tokens.ts",
  ]),
]);

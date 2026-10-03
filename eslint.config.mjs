import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Convex guardrail: public functions must be built from the wrappers in
  // convex/lib/functions.ts, which check identity and plan first.
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/lib/**", "convex/_generated/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // The same public builders, untyped, under other names.
          paths: [
            {
              name: "convex/server",
              importNames: ["queryGeneric", "mutationGeneric", "actionGeneric"],
              message:
                "Use publicQuery, userQuery, userMutation, proQuery or proMutation from convex/lib/functions.ts. For actions, call an internal query that runs the same check first.",
            },
          ],
          patterns: [
            {
              group: ["**/_generated/server"],
              importNames: ["query", "mutation", "action"],
              message:
                "Use publicQuery, userQuery, userMutation, proQuery or proMutation from convex/lib/functions.ts. For actions, call an internal query that runs the same check first.",
            },
          ],
        },
      ],
    },
  },
  // Problem secrecy (docs/notes/decisions.md §7): no page may import problem
  // files, or the scripts that read them, so tests can't ship to the browser.
  {
    files: ["app/**", "components/**", "lib/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/problems/**", "@/problems/**", "**/scripts/**", "@/scripts/**"],
              message: "Problem files and scripts stay on the server. Read problems through Convex queries.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Solutions are standalone programs written the way users write them.
    "problems/**/solutions/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;

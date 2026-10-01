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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;

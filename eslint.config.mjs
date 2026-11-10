import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `{ omitted, ...rest } = input` is the idiomatic way to drop a key.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Screens merged from NYX-KAIROS (ADR 0010) predate the React Compiler rules.
    // Kept as warnings until each screen is split into smaller components
    // (tech debt tracked in docs/dev-log/2026-11.md). K's own code stays strict.
    files: ["src/features/*/components/**/*.tsx", "src/shared/ui/**/*.tsx", "src/shared/layout/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      // French UI text: React escapes apostrophes anyway (cosmetic rule).
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;

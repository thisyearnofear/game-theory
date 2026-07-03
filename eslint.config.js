import js from "@eslint/js";
import globals from "globals";
import reactDOM from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactX from "eslint-plugin-react-x";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  globalIgnores([
    "dist",
    "packages",
    "src/contracts/*",
    "!src/contracts/util.ts",
    "api", // Cloudflare Workers — separate TypeScript context
    "e2e", // Playwright tests — separate TypeScript context
    "playwright.config.ts",
  ]),
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactDOM.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      reactX.configs["recommended-typescript"],
      prettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRoot: import.meta.dirname,
      },
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  // Allow unavoidable SDK type assertions in ZK contract integration files
  {
    files: [
      "src/services/noirProofService.ts",
      "src/hooks/useZKDilemma.ts",
      "src/contracts/util.ts",
    ],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
);

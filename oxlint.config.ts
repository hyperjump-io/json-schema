import { defineConfig } from "oxlint";
import stylistic from "@stylistic/eslint-plugin";

import type { DummyRuleMap } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true
  },
  ignorePatterns: [
    "coverage/**"
  ],
  plugins: [
    "typescript",
    "import",
    "jsdoc",
    "node",
    "promise"
  ],
  jsPlugins: [
    "@stylistic/eslint-plugin"
  ],
  rules: {
    ...stylistic.configs.customize({
      arrowParens: true,
      braceStyle: "1tbs",
      commaDangle: "never",
      quotes: "double",
      semi: true
    }).rules as DummyRuleMap,
    "@stylistic/array-bracket-newline": ["error", "consistent"],
    "@stylistic/curly-newline": ["error", { consistent: true }],
    "@stylistic/function-paren-newline": ["error", "consistent"],
    "@stylistic/implicit-arrow-linebreak": ["error"],
    "@stylistic/newline-per-chained-call": ["error"],
    "@stylistic/no-extra-semi": ["error"],
    "@stylistic/object-curly-newline": ["error", { consistent: true }],
    "@stylistic/semi-style": ["error"],
    "@stylistic/switch-colon-spacing": ["error"],
    "curly": ["error", "all"],
    "no-unused-vars": ["error", { caughtErrorsIgnorePattern: "^_", argsIgnorePattern: "^_" }]
  }
});

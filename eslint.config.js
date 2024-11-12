import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";


export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  stylistic.configs.customize({
    arrowParens: true,
    braceStyle: "1tbs",
    commaDangle: "never",
    flat: true,
    jsx: false,
    quotes: "double",
    semi: true
  }),
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.node
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      "import/resolver": {
        node: {},
        typescript: {}
      }
    },
    rules: {
      // JavaScript
      "no-console": ["error"],
      "no-empty-function": "off",
      "no-fallthrough": "off",

      // TypeScript
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      // Imports
      "import/extensions": ["error", "ignorePackages"],
      "import/newline-after-import": ["error", { count: 2, exactCount: false, considerComments: true }],

      // Stylistic
      "@stylistic/multiline-ternary": "off",
      "@stylistic/no-mixed-operators": "off",
      "@stylistic/no-multiple-empty-lines": ["error", { max: 2, maxEOF: 0, maxBOF: 0 }], // Allow max=2 for imports
      "@stylistic/quote-props": ["error", "consistent"],
      "@stylistic/yield-star-spacing": ["error", "after"]
    }
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked
  }
];

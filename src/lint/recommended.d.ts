import type { Preset } from "unified";

/**
 * The recommended lint rules. Each finds something that's likely a mistake.
 * A rule is a warning if the schema still works, and an error if it can't
 * be compiled, like `reference-without-target`.
 *
 * Use it in `hjlint`'s `.hyperjumprc`, and adjust rules after it:
 *
 * ```json
 * {
 *   "plugins": [
 *     "@hyperjump/json-schema/lint/recommended",
 *     ["@hyperjump/json-schema/lint/rules/then-else-without-if", ["error"]]
 *   ]
 * }
 * ```
 */
declare const recommended: Preset;
export default recommended;

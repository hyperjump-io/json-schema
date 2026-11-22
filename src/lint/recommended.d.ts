import type { Preset } from "unified";

/**
 * The recommended lint rules. Each finds something that's likely a mistake.
 * A rule is a warning if the schema still works, and an error if it can't
 * be compiled, like `reference-without-target`, or if it breaks a
 * requirement of the spec that this implementation recovers from but others
 * might not, like `misplaced-dialect`.
 *
 * Use it in the CLI's `.hyperjumprc`, and adjust rules after it:
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

import type { Preset } from "unified";

/**
 * The recommended lint rules. Each finds something that's likely a mistake,
 * and each is a warning, because the schema still works.
 *
 * Use it in `.jsonschemarc` and adjust rules after it:
 *
 * ```json
 * {
 *   "plugins": [
 *     "@hyperjump/json-schema-next/lint/recommended",
 *     ["@hyperjump/json-schema-next/lint/rules/then-else-without-if", ["error"]]
 *   ]
 * }
 * ```
 */
declare const recommended: Preset;
export default recommended;

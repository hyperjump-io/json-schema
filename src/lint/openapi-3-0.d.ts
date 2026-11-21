import type { Preset } from "unified";

/**
 * The lint rules for OpenAPI 3.0 Schema Objects: `recommended`, with the
 * rules for what OpenAPI 3.0 requires and for its keywords, like
 * `array-without-items` and `unknown-field`. What 3.0 says MUST or MUST NOT be,
 * like `readOnly` and `writeOnly` both `true`, is an error, even where
 * `recommended` makes it a warning because JSON Schema allows it.
 * `implicit-dialect` is off, because 3.0's Schema Objects don't have
 * `$schema`.
 *
 * ```json
 * {
 *   "plugins": ["@hyperjump/json-schema/lint/openapi-3-0"]
 * }
 * ```
 */
declare const openApi30: Preset;
export default openApi30;

import type { Preset } from "unified";

/**
 * The lint rules for OpenAPI 3.2 Schema Objects: `recommended`, with the
 * rules for OpenAPI's keywords, like `unknown-field`,
 * `deprecated-example`, and `deprecated-xml-field`.
 *
 * ```json
 * {
 *   "plugins": ["@hyperjump/json-schema/lint/openapi-3-2"]
 * }
 * ```
 */
declare const openApi32: Preset;
export default openApi32;

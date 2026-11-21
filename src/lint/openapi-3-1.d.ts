import type { Preset } from "unified";

/**
 * The lint rules for OpenAPI 3.1 Schema Objects: `recommended`, with the
 * rules for OpenAPI's keywords, like `unknown-field`.
 *
 * ```json
 * {
 *   "plugins": ["@hyperjump/json-schema/lint/openapi-3-1"]
 * }
 * ```
 */
declare const openApi31: Preset;
export default openApi31;

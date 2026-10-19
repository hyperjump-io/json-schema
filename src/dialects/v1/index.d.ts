import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

/** The URI of the JSON Schema v1 dialect */
export const v1DialectUri: "https://json-schema.org/v1";

/**
 * The JSON Schema v1 dialect. Unknown keywords are errors. Add custom keywords with
 * {@link JsonSchema.extendDialect}. `conditional`, `itemPattern`, and
 * `requireAllExcept`, which aren't full proposals yet, are added to it that
 * way.
 *
 * `format` validates by default, with the lite formats. Add the full formats
 * (`formats/full.js`) for `hostname`, `idn-hostname`, and `idn-email`.
 */
export const v1Dialect: Dialect;

/**
 * Add JSON Schema v1: its keywords, formats, and dialect. `conditional`,
 * `itemPattern`, and `requireAllExcept` are added with
 * {@link JsonSchema.extendDialect}.
 *
 * Every other keyword and format it uses is shared with the other presets.
 * Each preset adds the ones it uses that haven't been added, so presets don't
 * depend on each other, and a keyword or format you replaced stays replaced.
 *
 * @throws Error if it's already been added
 */
export function addV1(jsonSchema: JsonSchema): void;

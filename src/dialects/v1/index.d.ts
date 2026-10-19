import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

// Every JsonSchema has the v1 dialect.

/** The URI of the JSON Schema v1 dialect */
export const v1DialectUri: "https://json-schema.org/v1";

/**
 * The JSON Schema v1 dialect. Every {@link JsonSchema} has it. Unknown
 * keywords are errors. Add custom keywords with
 * {@link JsonSchema.extendDialect}. `conditional`, `itemPattern`, and
 * `requireAllExcept`, which aren't full proposals yet, are added to it that
 * way.
 *
 * `format` validates by default, with the lite formats. Add the full formats
 * (`formats/full.js`) for `hostname`, `idn-hostname`, and `idn-email`.
 */
export const v1Dialect: Dialect;

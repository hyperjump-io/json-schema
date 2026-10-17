import type { JsonSchema } from "../json-schema.d.ts";
import type { Dialect } from "../dialect.d.ts";

/** The URI of the JSON Schema v1 dialect */
export const v1DialectUri: "https://json-schema.org/v1";

/**
 * The JSON Schema v1 dialect. Unknown keywords are errors. Add custom
 * keywords with {@link JsonSchema.extendDialect}.
 */
export const v1Dialect: Dialect;

/**
 * Add the v1 keywords and dialect to a {@link JsonSchema}. It also adds
 * `conditional`, `itemPattern`, and `requireAllExcept`, which aren't full
 * proposals yet, to the dialect.
 *
 * `format` validates by default, and the lite formats are added. Add the
 * full formats (`formats/full.js`) for `hostname`, `idn-hostname`, and
 * `idn-email`.
 * @throws Error if the v1 dialect is already defined.
 */
export const addV1: (jsonSchema: JsonSchema) => void;

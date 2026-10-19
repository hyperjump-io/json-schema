import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

/**
 * The URI of the JSON Schema draft-07 dialect. `$schema` is usually
 * `http://json-schema.org/draft-07/schema#`, which identifies the same
 * dialect.
 */
export const draft07DialectUri: "http://json-schema.org/draft-07/schema";

/**
 * The JSON Schema draft-07 dialect. `$ref` replaces the whole schema, so its
 * siblings are ignored. Unknown keywords are ignored. `format` validates by
 * default, as most implementations of these drafts did. Set the
 * `validateFormats` config to `false` to make it only an annotation. A
 * format the draft doesn't define is only an annotation either way.
 */
export const draft07Dialect: Dialect;

/**
 * Add JSON Schema draft-07: its keywords, its dialect, and a registry with its
 * meta-schema. It adds draft-04's `$id` (`id`), `$ref`, `items`,
 * `additionalItems`, `dependencies`, and `format`. Every other keyword is
 * shared with v1, which every {@link JsonSchema} has.
 *
 * @throws Error if it's already been added
 */
export function addDraft07(jsonSchema: JsonSchema): void;

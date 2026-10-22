import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

/**
 * The URI of the JSON Schema draft-04 dialect. `$schema` is usually
 * `http://json-schema.org/draft-04/schema#`, which identifies the same
 * dialect.
 */
export const draft04DialectUri: "http://json-schema.org/draft-04/schema";

/**
 * The JSON Schema draft-04 dialect. `$ref` replaces the whole schema, so its
 * siblings are ignored. Unknown keywords are ignored. `format` validates by
 * default, as most implementations of these drafts did. Set the
 * `validateFormats` config to `false` to make it only an annotation. A
 * format the draft doesn't define is only an annotation either way.
 */
export const draft04Dialect: Dialect;

/**
 * Add JSON Schema draft-04: its keywords, formats, and dialect. Its own are
 * its `dependencies`, `enum`, `required`, `maximum`, `minimum`,
 * `exclusiveMaximum`, and `exclusiveMinimum`, draft-07's `$id` (`id`),
 * `$ref`, and `format`, 2019-09's `items` and `additionalItems`, and
 * draft-06's `hostname` format. Its `enum`,
 * `required`, and `dependencies` can't be empty or have duplicates, as
 * draft-04 says, and its `exclusiveMaximum` and `exclusiveMinimum` require
 * `maximum` and `minimum`.
 *
 * Every other keyword and format it uses is shared with the other presets.
 * Each preset adds the ones it uses that haven't been added, so presets don't
 * depend on each other, and a keyword or format you replaced stays replaced.
 *
 * @throws Error if it's already been added
 */
export function addDraft04(jsonSchema: JsonSchema): void;

import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

export { addVocabulary } from "../../keywords/vocabulary.js";
export type { Vocabulary } from "../../keywords/vocabulary.js";

/** The URI of the JSON Schema 2019-09 dialect */
export const draft201909DialectUri: "https://json-schema.org/draft/2019-09/schema";

/**
 * The JSON Schema 2019-09 dialect: the keywords of the vocabularies its
 * meta-schema lists. Unknown keywords are annotations. `format` is an
 * annotation by default. Set the `validateFormats` config to validate it.
 *
 * The meta-schema describes itself, so the dialect can't be built from it
 * and is added instead.
 */
export const draft201909Dialect: Dialect;

/**
 * Add JSON Schema 2019-09: its `$anchor`, `$recursiveAnchor`,
 * `$recursiveRef`, `items`, and `additionalItems`, its vocabularies (with
 * {@link addVocabulary}), its dialect, and a registry with its meta-schemas.
 * Meta-schemas that extend 2019-09 with `$vocabulary` define their own
 * dialects. Use {@link addVocabulary} to add vocabularies they can use.
 *
 * Every other keyword is shared with v1, which every {@link JsonSchema}
 * has.
 *
 * @throws Error if it's already been added
 */
export const addDraft201909: (jsonSchema: JsonSchema) => void;

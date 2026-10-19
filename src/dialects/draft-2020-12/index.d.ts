import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect } from "../../dialect.d.ts";

export { addVocabulary } from "../../keywords/vocabulary.js";
export type { Vocabulary } from "../../keywords/vocabulary.js";

/** The URI of the JSON Schema 2020-12 dialect */
export const draft202012DialectUri: "https://json-schema.org/draft/2020-12/schema";

/**
 * The JSON Schema 2020-12 dialect: the keywords of the vocabularies its
 * meta-schema lists. Unknown keywords are annotations. `format` is an
 * annotation by default. Set the `validateFormats` config to validate it.
 *
 * The meta-schema describes itself, so the dialect can't be built from it
 * and is added instead.
 */
export const draft202012Dialect: Dialect;

/**
 * Add JSON Schema 2020-12: its `$dynamicRef`, its vocabularies (with
 * {@link addVocabulary}), its dialect, and a registry with its meta-schemas.
 * Meta-schemas that extend 2020-12 with `$vocabulary` define their own
 * dialects. Use {@link addVocabulary} to add vocabularies they can use.
 *
 * Every other keyword is shared with v1, which every {@link JsonSchema}
 * has.
 *
 * @throws Error if it's already been added
 */
export const addDraft202012: (jsonSchema: JsonSchema) => void;

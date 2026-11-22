import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `$vocabulary` anywhere but the document's root, in 2019-09 and 2020-12.
 * The specs say it belongs at the root of a meta-schema's document and
 * must not appear in subschemas. This implementation ignores it where a
 * schema resource doesn't start. It uses one at the root of an embedded
 * resource, so a meta-schema embedded in a bundle defines its dialect,
 * but other implementations might not, so it's an error in the
 * recommended preset.
 * It has no options.
 */
declare const misplacedVocabulary: Plugin<JsonSchemaDocumentNode, void>;
export default misplacedVocabulary;

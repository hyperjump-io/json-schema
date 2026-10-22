import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property next to `$ref` in draft-04 through draft-07. There, `$ref`
 * replaces the whole schema, so every other property is ignored, including
 * keywords, annotations like `description`, an identifier, and
 * `definitions`. A reference into ignored `definitions` doesn't find a
 * schema. 2019-09 and later evaluate `$ref` alongside its siblings.
 *
 * `$schema` isn't reported, because it decides the dialect, which is what
 * makes `$ref` replace the schema. `$comment` isn't reported, because a
 * comment never has an effect. It has no options.
 */
declare const ignoredRefSiblings: Plugin<JsonSchemaDocumentNode, void>;
export default ignoredRefSiblings;

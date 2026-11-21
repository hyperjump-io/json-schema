import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `attribute` or `wrapped` in OpenAPI 3.2's `xml`, which 3.2 deprecates
 * for `nodeType`. `attribute: true` is `nodeType: "attribute"`, and
 * `wrapped: true` is `nodeType: "element"`. `false` is the default, so it
 * can be removed. Only 3.2's `xml` has `nodeType`, so 3.0's and 3.1's
 * aren't reported. It has no options.
 */
declare const deprecatedXmlField: Plugin<JsonSchemaDocumentNode, void>;
export default deprecatedXmlField;

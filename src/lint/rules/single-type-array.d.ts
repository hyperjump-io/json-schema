import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `type` that's an array of one type, like `["string"]`, which is the same
 * as the type on its own, `"string"`. Turn it off if you write arrays
 * everywhere so adding a type is a smaller change. It has no options.
 */
declare const singleTypeArray: Plugin<JsonSchemaDocumentNode, void>;
export default singleTypeArray;

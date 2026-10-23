import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `type` in a `propertyNames` schema. Property names are always strings, so
 * a `type` that allows strings, like `"string"`, has no effect, and one
 * that doesn't, like `"integer"`, rejects every property name, so only
 * objects without properties are valid. A name that looks like a number,
 * like `"1"`, is still a string.
 *
 * Only `type` in the `propertyNames` schema itself is checked, not in a
 * schema it references or combines with `allOf`, which may also apply to
 * other values. It has no options.
 */
declare const propertyNamesType: Plugin<JsonSchemaDocumentNode, void>;
export default propertyNamesType;

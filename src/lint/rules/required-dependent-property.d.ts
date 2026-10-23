import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property that a dependency in `dependentRequired`, or `dependencies` in
 * draft-04 through draft-07, requires, but that `required` next to it
 * already requires, like `b` in `"required": ["b"]` and
 * `"dependentRequired": { "a": ["b"] }`. It's always required, so the
 * dependency doesn't add anything for it.
 *
 * A dependency on a property that's in `required` is reported by
 * `dependency-on-required-property` instead. Only `required` in the same
 * schema is checked. It has no options.
 */
declare const requiredDependentProperty: Plugin<JsonSchemaDocumentNode, void>;
export default requiredDependentProperty;

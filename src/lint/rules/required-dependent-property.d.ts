import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property that a dependency in `dependentRequired`, or `dependencies` in
 * draft-04 through draft-07, requires, but that's already required, like
 * `b` in `"required": ["b"]` and `"dependentRequired": { "a": ["b"] }`. It's
 * always required, so the dependency doesn't add anything for it.
 *
 * A property is required if every object that passes the schema's other
 * keywords has it, so `required` in an `allOf`, or in a schema a `$ref`
 * applies, counts too. A dependency on a property that's required is
 * reported by `dependency-on-required-property` instead. It has no options.
 */
declare const requiredDependentProperty: Plugin<JsonSchemaDocumentNode, void>;
export default requiredDependentProperty;

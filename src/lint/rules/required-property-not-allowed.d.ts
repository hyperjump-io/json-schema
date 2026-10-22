import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property in `required` that the same schema doesn't allow, so no object
 * is valid. Its schema in `properties` or a matching `patternProperties`
 * is `false`, or it's in neither and `additionalProperties` is `false`.
 * It's often a typo in `required` or in `properties`.
 *
 * It only looks at one schema at a time. `unevaluatedProperties: false`
 * isn't considered, because whether another schema evaluates the property
 * depends on the instance. It has no options.
 */
declare const requiredPropertyNotAllowed: Plugin<JsonSchemaDocumentNode, void>;
export default requiredPropertyNotAllowed;

import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `nullable` without `type` in the same schema, in OpenAPI 3.0. It only adds
 * `null` to the types `type` allows, "only if `type` is explicitly defined
 * within the same Schema Object", so without `type` it has no effect.
 * Every value is valid already, including `null`. A `type` in another
 * schema, like one in an `allOf`, doesn't count.
 * It has no options.
 */
declare const nullableWithoutType: Plugin<JsonSchemaDocumentNode, void>;
export default nullableWithoutType;

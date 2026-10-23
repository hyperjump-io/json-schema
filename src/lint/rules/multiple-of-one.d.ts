import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `multipleOf: 1` where `type` allows numbers. It only allows integers, which
 * `type` says more clearly: `"type": "number", "multipleOf": 1` is
 * `"type": "integer"`. Where `type` already only allows integers, it has no
 * effect.
 *
 * Without `type`, values that aren't numbers are valid, so it isn't
 * reported. Draft-04 says an integer is a number without a fraction or
 * exponent part, so an implementation that follows it strictly rejects
 * `1.0` as an integer, while `multipleOf: 1` allows it. It only looks at
 * `type` in the same schema. It has no options.
 */
declare const multipleOfOne: Plugin<JsonSchemaDocumentNode, void>;
export default multipleOfOne;

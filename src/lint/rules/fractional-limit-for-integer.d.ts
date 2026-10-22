import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `maximum`, `minimum`, `exclusiveMaximum`, or `exclusiveMinimum` that isn't
 * an integer, where `type` allows integers but not other numbers. Only
 * integers are valid, so `maximum: 7.8` is the same as `maximum: 7`, and
 * `exclusiveMaximum: 7.8` is also the same as `maximum: 7`. It's misleading,
 * and may mean the author thought other numbers were allowed.
 *
 * Draft-04's `maximum` and `minimum` aren't checked, because its boolean
 * `exclusiveMaximum` and `exclusiveMinimum` change them. It only looks at
 * `type` in the same schema. It has no options.
 */
declare const fractionalLimitForInteger: Plugin<JsonSchemaDocumentNode, void>;
export default fractionalLimitForInteger;

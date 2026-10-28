import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `maximum`, `minimum`, `exclusiveMaximum`, or `exclusiveMinimum` that isn't
 * an integer, where `type` allows integers but not other numbers. Only
 * integers are valid, so `maximum: 7.8` is the same as `maximum: 7`, and
 * `exclusiveMaximum: 7.8` is the same as `maximum: 7` too. It's misleading,
 * and may mean the author thought other numbers were allowed.
 *
 * Draft-04's `maximum` and `minimum` are checked too, and with its boolean
 * `exclusiveMaximum` or `exclusiveMinimum`, they're the same as the integer
 * they round to, inclusive. It only looks at `type` in the same schema. It
 * has no options.
 */
declare const fractionalLimitForInteger: Plugin<JsonSchemaDocumentNode, void>;
export default fractionalLimitForInteger;

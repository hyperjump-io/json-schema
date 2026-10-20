import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * draft-04's `exclusiveMaximum` or `exclusiveMinimum` without a sibling
 * `maximum` or `minimum`. In draft-04, they're booleans that make `maximum`
 * and `minimum` exclusive, so neither does anything on its own.
 *
 * It finds draft-04's keywords by URI, so it does nothing in later dialects,
 * where `exclusiveMaximum` and `exclusiveMinimum` are numbers that work on
 * their own. It has no options.
 */
declare const exclusiveWithoutMaximumMinimum: Plugin<JsonSchemaDocumentNode, void>;
export default exclusiveWithoutMaximumMinimum;

import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `maximum`, `minimum`, `exclusiveMaximum`, or `exclusiveMinimum` beyond
 * ±9,007,199,254,740,991 (2⁵³ - 1), where `type` allows integers but not
 * other numbers. Implementations that use IEEE 754 doubles for numbers,
 * like JavaScript ones, including this one, can't represent every integer
 * beyond that, so they may compare values to the limit inexactly.
 *
 * Limits like int64's maximum can be deliberate, for implementations that
 * use 64-bit integers. Turn the rule off if yours are. It only looks at
 * `type` in the same schema. It has no options.
 */
declare const unsafeIntegerLimit: Plugin<JsonSchemaDocumentNode, void>;
export default unsafeIntegerLimit;

import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `type` next to `const` or `enum` when it allows the `const` value or every
 * value in `enum`. Only those values are valid, and their types are already
 * known, so `type` never fails on its own. Removing it says the same thing
 * with less. Some tools, like code generators, read `type` rather than the
 * values. Turn this rule off if yours do.
 *
 * If `type` doesn't allow a value, it does have an effect, and
 * `const-or-enum-value-for-disallowed-type` reports the value instead. Next
 * to an empty `enum`, which `keyword-allows-nothing` reports, nothing is valid, so `type`
 * has no effect. It has no options.
 */
declare const typeImpliedByConstOrEnum: Plugin<JsonSchemaDocumentNode, void>;
export default typeImpliedByConstOrEnum;

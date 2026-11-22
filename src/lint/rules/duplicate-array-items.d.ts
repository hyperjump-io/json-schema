import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An item that's equal to one before it, in an array the specs say must be
 * unique: `required`, `type`, `dependentRequired`, `dependencies`,
 * `requireAllExcept`, and `enum` in draft-04. It has no effect, and it may
 * be a typo for one that's missing. This implementation accepts it, but
 * other implementations might not, so it's an error in the recommended
 * preset. Draft-06 and later say `enum`'s values should be unique, which
 * `duplicate-enum-values` reports. Values are compared as JSON Schema
 * does, and each duplicate is reported.
 * It has no options.
 */
declare const duplicateArrayItems: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateArrayItems;

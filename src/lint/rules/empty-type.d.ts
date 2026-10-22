import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `type` that's an empty array. No value has one of its types, so the
 * schema fails every instance. That's what `false` is for, so an empty
 * `type` is more likely types that are missing.
 *
 * Draft-04 through 2020-12 allow it, though their meta-schemas don't, and
 * where they disagree, the spec is followed. v1 doesn't allow it, so there
 * it's a problem with the schema, which this rule doesn't report. It has
 * no options.
 */
declare const emptyType: Plugin<JsonSchemaDocumentNode, void>;
export default emptyType;

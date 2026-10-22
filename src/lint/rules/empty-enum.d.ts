import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An empty `enum`. No value is equal to one of its values, so the schema
 * fails every instance. That's what `false` is for, so an empty `enum` is
 * more likely values that are missing.
 *
 * The specs say `enum` should have at least one value. Draft-04 says it
 * must, so there it's a problem with the schema, which this rule doesn't
 * report. It has no options.
 */
declare const emptyEnum: Plugin<JsonSchemaDocumentNode, void>;
export default emptyEnum;

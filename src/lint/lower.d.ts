import type { KeywordGroup } from "../kernel/kernel.d.ts";
import type { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { JsonSchemaSession } from "../session.d.ts";

/** A keyword's group, with the keyword's node and the nodes of the siblings it read, for where messages go */
export type LoweredKeyword = {
  group: KeywordGroup;
  keywordNode: JsonSchemaKeywordNode;
  sourceNodes: JsonSchemaKeywordNode[];
};

/** Each object schema's keyword groups, in the order they're in the schema, which isn't always the order they're evaluated */
export type LintSchemas = Map<JsonSchemaNode, LoweredKeyword[]>;

/**
 * What every object schema in a document lowers to (KERNEL.md, "Lowering for
 * lint"), without compiling or retrieving anything. A subschema is `apply`
 * of its location, and a reference is `apply` of the URI it resolves to. The
 * dynamic anchors of a resource in the document are known, so a dynamic
 * reference into one that isn't lowers to `dynamicApply`. A keyword whose
 * value doesn't fit its shape, or that can't be lowered, has no group, and
 * neither does one without `lower`, like `$defs`. A schema whose dialect
 * isn't known isn't included.
 *
 * Pass the session the schema was resolved in
 * (`file.data.jsonSchemaSession`). A document is lowered once for each
 * session, so rules share it.
 */
export const lowerForLint: (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<LintSchemas>;

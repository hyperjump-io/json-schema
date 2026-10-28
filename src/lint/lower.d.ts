import type { Expression, KeywordGroup } from "../kernel/kernel.d.ts";
import type { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { JsonSchemaSession } from "../session.d.ts";

/** A keyword's group, with the keyword's node and the nodes of the siblings it read, for where messages go */
export type LoweredKeyword = {
  group: KeywordGroup;
  keywordNode: JsonSchemaKeywordNode;
  sourceNodes: JsonSchemaKeywordNode[];
  /** The siblings it read that it lowers the same without, like `minContains: 1` for `contains` */
  sourcesWithoutEffect: JsonSchemaKeywordNode[];
  cameFrom: CameFrom;
};

/**
 * The keyword nodes an operation of the group, or one of its fields, came
 * from, in document order. The keyword is lowered again without each
 * sibling it read that's in the schema. A field that's different without a
 * sibling came from the sibling (draft-04's `exclusiveMaximum` for `range`'s
 * `exclusiveMax`), and an operation that isn't there without it came from
 * the keyword and the sibling (`if` and `then` for the `apply` of `then`'s
 * schema). Everything else came from the keyword. A sibling with its default
 * value lowers the same as without it, so nothing came from it.
 */
export type CameFrom = (operation: Expression, field?: string) => JsonSchemaKeywordNode[];

/** Each object schema's keyword groups, in the order they're in the schema, which isn't always the order they're evaluated */
export type LintSchemas = Map<JsonSchemaNode, LoweredKeyword[]>;

/**
 * What every object schema in a document lowers to
 * (`design/specs/kernel/lowering-for-lint.md`), without compiling or retrieving anything. A subschema is `apply`
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

/**
 * The keyword groups of an object schema in a document, in the order
 * they're evaluated, lowered as {@link lowerForLint} lowers them, without
 * caching. It's for a schema that isn't in the document as it is, like
 * one a rule builds from others' keywords, whose subschemas are nodes in
 * the document. It's undefined if the schema isn't an object or its
 * dialect isn't known.
 */
export const lowerSchemaForLint: (session: JsonSchemaSession, tree: JsonSchemaDocumentNode, schemaNode: JsonSchemaNode) => Promise<KeywordGroup[] | undefined>;

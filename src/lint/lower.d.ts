import type { Expression, KeywordGroup } from "../kernel/kernel.d.ts";
import type { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";

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

/**
 * Each object schema's keyword groups, in the order they're in the schema,
 * which isn't always the order they're evaluated (see `LintDocument.schemas`)
 */
export type LintSchemas = Map<JsonSchemaNode, LoweredKeyword[]>;

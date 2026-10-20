import type { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";

/**
 * Calls `visitor` with every schema in the document, including embedded
 * resources, which stay in the tree. Values that couldn't be parsed aren't
 * schemas, so they aren't visited.
 */
export const visitSchemas: (
  tree: JsonSchemaDocumentNode,
  visitor: (schemaNode: JsonSchemaNode) => void
) => void;

/**
 * Calls `visitor` with every keyword in the document that has the given
 * keyword URI, and the schema it's in. Keywords are found by URI, never by
 * name, so a rule works in every dialect that has the keyword and does
 * nothing in one that doesn't.
 */
export const visitKeywords: (
  tree: JsonSchemaDocumentNode,
  keywordUri: string,
  visitor: (keywordNode: JsonSchemaKeywordNode, schemaNode: JsonSchemaNode) => void
) => void;

/**
 * The value of a sibling keyword, by keyword URI, such as `if` for `then`.
 * It's undefined if the schema doesn't have the keyword or isn't an object.
 */
export const siblingKeyword: (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaNode | undefined;

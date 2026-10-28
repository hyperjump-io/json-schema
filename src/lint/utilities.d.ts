import type { Node } from "unist";
import type { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts";

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
 * Calls `visitor` with every reference in the document and the absolute URI
 * it refers to. That's the value of a keyword whose shape is `"reference"`
 * (`$ref` since 2019-09, 2020-12's `$dynamicRef`, `$recursiveRef`),
 * resolved against the schema resource it's in, or a schema that's a
 * reference (`$ref` in draft-04 through draft-07). `node` is the keyword's
 * value or the reference.
 *
 * A dynamic reference is visited with the schema it resolves to, which is
 * where it starts. What it applies can be another schema, depending on
 * evaluation. v1's `$dynamicRef` is an anchor name, not a reference.
 */
export const visitReferences: (
  tree: JsonSchemaDocumentNode,
  visitor: (uri: string, node: JsonSchemaNode) => void
) => void;

/**
 * An official dialect's URI as its meta-schema identifies itself, like
 * `http://json-schema.org/draft-07/schema#` with its empty fragment, given
 * its URI without a fragment. It's undefined for any other dialect.
 */
export const canonicalDialectUri: (dialectUri: string) => string | undefined;

/**
 * Calls `visitor` with the value of every `$schema` in the document that's
 * a string, including in schemas that are references (draft-04 through
 * draft-07), where `$schema` still decides the dialect.
 */
export const visitDialectUris: (
  tree: JsonSchemaDocumentNode,
  visitor: (valueNode: JsonSchemaNode & { jsonType: "string" }) => void
) => void;

/**
 * A keyword in a schema, by keyword URI. It's undefined if the schema
 * doesn't have the keyword or isn't an object. Use it instead of
 * {@link siblingKeyword} when you need the keyword's name or position, not
 * just its value.
 */
export const findKeyword: (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaKeywordNode | undefined;

/**
 * The value of a sibling keyword, by keyword URI, such as `if` for `then`.
 * It's undefined if the schema doesn't have the keyword or isn't an object.
 */
export const siblingKeyword: (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaNode | undefined;

/**
 * Where a property name is in a keyword's value: its entry, if the value is
 * an object, or the item that's the name, if it's an array, like in
 * `required`. It's undefined if it isn't there.
 */
export const nodeFor: (keywordNode: JsonSchemaKeywordNode, name: string) => Node | undefined;

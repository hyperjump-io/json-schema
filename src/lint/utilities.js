/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/**
 * Call `visitor` with every schema in the document, including embedded
 * resources, which stay in the tree. Schemas inside values that couldn't be
 * parsed aren't schemas, so they aren't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (schemaNode: JsonSchemaNode) => void) => void
 */
export const visitSchemas = (tree, visitor) => {
  /** @type (node: TreeNode) => void */
  const visit = (node) => {
    if (node.type === "json-schema") {
      visitor(/** @type JsonSchemaNode */ (node));
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  visit(/** @type TreeNode */ (tree));
};

/**
 * Call `visitor` with every keyword in the document with the given keyword
 * URI and the schema it's in. Keywords are found by URI, never by name, so
 * this works in every dialect that has the keyword and finds nothing in one
 * that doesn't.
 *
 * @type (tree: JsonSchemaDocumentNode, keywordUri: string, visitor: (keywordNode: JsonSchemaKeywordNode, schemaNode: JsonSchemaNode) => void) => void
 */
export const visitKeywords = (tree, keywordUri, visitor) => {
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (property.keywordUri === keywordUri) {
        visitor(property, schemaNode);
      }
    }
  });
};

export { siblingKeyword } from "../keywords/utilities.js";

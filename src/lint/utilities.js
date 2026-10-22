import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/** @type (tree: JsonSchemaDocumentNode, visitor: (node: TreeNode) => void) => void */
const visitNodes = (tree, visitor) => {
  /** @type (node: TreeNode) => void */
  const visit = (node) => {
    visitor(node);
    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  visit(/** @type TreeNode */ (tree));
};

/**
 * Call `visitor` with every schema in the document, including embedded
 * resources, which stay in the tree. Schemas inside values that couldn't be
 * parsed aren't schemas, so they aren't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (schemaNode: JsonSchemaNode) => void) => void
 */
export const visitSchemas = (tree, visitor) => {
  visitNodes(tree, (node) => {
    if (node.type === "json-schema") {
      visitor(/** @type JsonSchemaNode */ (node));
    }
  });
};

const refUri = "https://json-schema.org/keyword/ref";

/**
 * Call `visitor` with every static reference in the document and the
 * absolute URI it refers to. That's the value of a `$ref` keyword (2019-09
 * and later), resolved against the schema resource it's in, or a schema
 * that's a reference (`$ref` in draft-04 through draft-07). `node` is the
 * `$ref` keyword's value or the reference. A `$ref` whose value isn't a
 * valid IRI reference is a schema problem, so it isn't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (uri: string, node: JsonSchemaNode) => void) => void
 */
export const visitReferences = (tree, visitor) => {
  visitNodes(tree, (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    if (schemaNode.type === "reference") {
      visitor(schemaNode.href, schemaNode);
    } else if (schemaNode.type === "json-schema" && schemaNode.jsonType === "object") {
      for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
        const valueNode = property.children[1];
        if (property.keywordUri === refUri && valueNode.jsonType === "string") {
          let uri;
          try {
            uri = resolveIri(valueNode.value, toAbsoluteIri(schemaNode.location));
          } catch {
            continue;
          }
          visitor(uri, valueNode);
        }
      }
    }
  });
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

/**
 * A keyword in a schema, by keyword URI. It's undefined if the schema
 * doesn't have the keyword or isn't an object. Use it instead of
 * `siblingKeyword` when you need the keyword's name or position, not just
 * its value.
 *
 * @type (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaKeywordNode | undefined
 */
export const findKeyword = (schemaNode, keywordUri) => {
  if (schemaNode.jsonType !== "object") {
    return;
  }

  for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
    if (property.keywordUri === keywordUri) {
      return property;
    }
  }
};

export { siblingKeyword } from "../keywords/utilities.js";

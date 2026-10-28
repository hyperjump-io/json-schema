/**
 * @import { Node } from "unist"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
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
  visitNodes(tree, (node) => {
    if (node.type === "json-schema") {
      visitor(/** @type JsonSchemaNode */ (node));
    }
  });
};

/**
 * Call `visitor` with every reference in the document and the absolute URI
 * it refers to. That's the value of a keyword whose shape is `"reference"`
 * (`$ref` since 2019-09, 2020-12's `$dynamicRef`, `$recursiveRef`), or a
 * schema that's a reference (`$ref` in draft-04 through draft-07). The
 * resolver gives both the URI as `href`. `node` is the keyword's value or
 * the reference. A value that isn't a valid IRI reference is a schema
 * problem, so it isn't visited.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (uri: string, node: JsonSchemaNode) => void) => void
 */
export const visitReferences = (tree, visitor) => {
  visitNodes(tree, (node) => {
    const referenceNode = /** @type JsonSchemaNode */ (node);
    if ((referenceNode.type === "reference" || referenceNode.type === "json") && referenceNode.href !== undefined) {
      visitor(referenceNode.href, referenceNode);
    }
  });
};

/** Each official dialect's URI as its meta-schema identifies itself, by the URI without a fragment */
const canonicalDialectUris = new Map([
  "http://json-schema.org/draft-04/schema#",
  "http://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft/2019-09/schema",
  "https://json-schema.org/draft/2020-12/schema",
  "https://json-schema.org/v1"
].map((uri) => [uri.replace(/#$/, ""), uri]));

/**
 * An official dialect's URI as its meta-schema identifies itself, like
 * draft-07's with an empty fragment, by its URI without a fragment. It's
 * undefined for any other dialect.
 *
 * @type (dialectUri: string) => string | undefined
 */
export const canonicalDialectUri = (dialectUri) => canonicalDialectUris.get(dialectUri);

const schemaUri = "https://json-schema.org/keyword/schema";

/**
 * Call `visitor` with the value of every `$schema` in the document that's a
 * string. In draft-04 through draft-07, a schema with `$ref` is a reference,
 * whose properties aren't keywords, but its `$schema` still decides its
 * dialect, so it's visited too.
 *
 * @type (tree: JsonSchemaDocumentNode, visitor: (valueNode: JsonSchemaNode & { jsonType: "string" }) => void) => void
 */
export const visitDialectUris = (tree, visitor) => {
  visitNodes(tree, (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    if ((schemaNode.type !== "json-schema" && schemaNode.type !== "reference") || schemaNode.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const isSchema = schemaNode.type === "reference" ? property.children[0].value === "$schema" : property.keywordUri === schemaUri;
      const valueNode = property.children[1];
      if (isSchema && valueNode.jsonType === "string") {
        visitor(valueNode);
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

/**
 * The value of a keyword in a schema, by keyword URI, such as `if` for
 * `then`. It's undefined if the schema doesn't have the keyword or isn't an
 * object.
 *
 * @type (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaNode | undefined
 */
export const siblingKeyword = (schemaNode, keywordUri) => findKeyword(schemaNode, keywordUri)?.children[1];

/**
 * Where a property name is in a keyword's value: its entry, if the value is
 * an object, or the item that's the name, if it's an array, like in
 * `required`. It's undefined if it isn't there.
 *
 * @type (keywordNode: JsonSchemaKeywordNode, name: string) => Node | undefined
 */
export const nodeFor = (keywordNode, name) => {
  const valueNode = /** @type JsonSchemaNode */ (keywordNode.children[1]);
  if (valueNode.jsonType === "object") {
    return valueNode.children.find((propertyNode) => propertyNode.children[0].value === name);
  } else if (valueNode.jsonType === "array") {
    return valueNode.children.find((itemNode) => itemNode.jsonType === "string" && itemNode.value === name);
  }
};

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

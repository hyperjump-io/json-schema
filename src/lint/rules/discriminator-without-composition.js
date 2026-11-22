import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "../find-schema.d.ts"
 */

const discriminatorUris = ["3.1", "3.2"].map((version) => `https://spec.openapis.org/oas/${version}/keyword/discriminator`);
const compositionUris = ["allOf", "anyOf", "oneOf"].map((name) => `https://json-schema.org/keyword/${name}`);
const allOfUri = "https://json-schema.org/keyword/allOf";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const discriminatorWithoutComposition = lintRule({ origin: "json-schema-lint:discriminator-without-composition", url: "https://hyperjump.io/json-schema/linting/rules/discriminator-without-composition/" }, async (tree, file) => {
  // Which schemas refer to a parent from an `allOf` can only be seen in an
  // OpenAPI document. A schema in a file of its own can be a parent of
  // schemas in other documents.
  if (!isOpenApiDocument(tree)) {
    return;
  }

  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  /** @type [JsonSchemaKeywordNode, JsonSchemaNode][] */
  const discriminators = [];
  for (const uri of discriminatorUris) {
    visitKeywords(tree, uri, (keywordNode, schemaNode) => {
      if (!compositionUris.some((compositionUri) => findKeyword(schemaNode, compositionUri) !== undefined)) {
        discriminators.push([keywordNode, schemaNode]);
      }
    });
  }
  if (discriminators.length === 0) {
    return;
  }

  // The schemas an `allOf` entry refers to are parents, which the schemas
  // with that `allOf` are the alternatives of
  /** @type Set<JsonSchemaNode> */
  const parents = new Set();
  visitKeywords(tree, allOfUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "array") {
      return;
    }
    for (const itemNode of valueNode.children) {
      for (const href of referencesOf(/** @type JsonSchemaNode */ (itemNode))) {
        const found = /** @type FindSchemaResult | undefined */ (document.found.get(href));
        if (found?.status === "found") {
          parents.add(found.node);
        }
      }
    }
  });

  for (const [keywordNode, schemaNode] of discriminators) {
    if (!parents.has(schemaNode)) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' is only allowed with 'oneOf', 'anyOf', or 'allOf' next to it, or in a schema that an 'allOf' refers to`, { place: keywordNode.position });
    }
  }
});

export default discriminatorWithoutComposition;

/**
 * The references an `allOf` entry is, or has as a keyword, like `$ref`
 *
 * @type (node: JsonSchemaNode) => string[]
 */
const referencesOf = (node) => {
  if (node.type === "reference") {
    return [node.href];
  } else if (node.type !== "json-schema" || node.jsonType !== "object") {
    return [];
  }

  /** @type string[] */
  const hrefs = [];
  for (const property of node.children) {
    const valueNode = property.children[1];
    if (valueNode.type === "reference") {
      hrefs.push(valueNode.href);
    }
  }
  return hrefs;
};

/**
 * Whether the tree is an OpenAPI document: its root is data with an
 * `openapi`
 *
 * @type (tree: JsonSchemaDocumentNode) => boolean
 */
const isOpenApiDocument = (tree) => {
  const root = tree.children[0];
  return root !== undefined && root.type === "json" && root.jsonType === "object"
    && root.children.some((property) => property.children[0].value === "openapi");
};

import { lintRule } from "../lint-rule.js";

/**
 * @import { Node, Parent } from "unist"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const schemaUri = "https://json-schema.org/keyword/schema";
const draft201909Uri = "https://json-schema.org/draft/2019-09/schema";

/**
 * 2019-09 allows `$schema` at an embedded resource's root, but says a
 * document's resources should have the same dialect. Draft-04–07 don't
 * allow it there at all, which is `misplaced-dialect`'s, and 2020-12 allows
 * any dialect. The dialect a resource is in is its root's, and the one
 * around it is the closest schema's.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const embeddedDialectChange = lintRule({ origin: "json-schema-lint:embedded-dialect-change", url: "https://hyperjump.io/json-schema/linting/rules/embedded-dialect-change/" }, (tree, file) => {
  /** @type (node: Node, dialectUri: string | undefined) => void */
  const walk = (node, dialectUri) => {
    const schemaNode = /** @type JsonSchemaNode */ (/** @type unknown */ (node));
    if (schemaNode.type === "json-schema" && schemaNode.jsonType === "object" && dialectUri === draft201909Uri && schemaNode.dialectUri !== dialectUri) {
      const keywordNodes = /** @type JsonSchemaKeywordNode[] */ (schemaNode.children);
      const dialectNode = keywordNodes.find((keywordNode) => keywordNode.keywordUri === schemaUri);
      if (dialectNode !== undefined) {
        file.message("'$schema' names a different dialect from the schema it's in. 2019-09 says a document's schema resources should have the same dialect.", { place: dialectNode.position });
      }
    }

    const childDialectUri = schemaNode.type === "json-schema" ? schemaNode.dialectUri : dialectUri;
    for (const child of /** @type Parent */ (node).children ?? []) {
      walk(child, childDialectUri);
    }
  };

  walk(tree, undefined);
});

export default embeddedDialectChange;

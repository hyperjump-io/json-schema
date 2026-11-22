import { visit } from "unist-util-visit";
import { emptyArrays } from "../empty-arrays.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const emptyArray = lintRule({ origin: "json-schema-lint:empty-array", url: "https://hyperjump.io/json-schema/linting/rules/empty-array/" }, (tree, file) => {
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (/** @type unknown */ (node));
    if (schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const name = keywordNode.children[0].value;
      for (const [arrayNode, property] of emptyArrays(keywordNode)) {
        const where = property === undefined ? `'${name}'` : `'${name}' for '${property}'`;
        file.message(`${where} can't be empty`, { place: arrayNode.position });
      }
    }
  });
});

export default emptyArray;

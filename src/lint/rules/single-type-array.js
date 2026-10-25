import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const typeUris = [
  "https://json-schema.org/keyword/type",
  "https://json-schema.org/keyword/draft-2020-12/type"
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const singleTypeArray = lintRule({ origin: "jsonschema-lint:single-type-array", url: "https://hyperjump.io/json-schema/linting/rules/single-type-array/" }, (tree, file) => {
  for (const typeUri of typeUris) {
    visitKeywords(tree, typeUri, (keywordNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "array" || valueNode.children.length !== 1) {
        return;
      }

      const itemNode = valueNode.children[0];
      if (itemNode.jsonType === "string") {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has only one type, so it can be "${itemNode.value}" instead of an array`, { place: valueNode.position });
      }
    });
  }
});

export default singleTypeArray;

import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const typeUri = "https://json-schema.org/keyword/draft-2020-12/type";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const emptyType = lintRule({ origin: "json-schema-lint:empty-type", url: "https://hyperjump.io/json-schema/linting/rules/empty-type/" }, (tree, file) => {
  visitKeywords(tree, typeUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType === "array" && valueNode.children.length === 0) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' is empty, so nothing is valid against it`, { place: keywordNode.position });
    }
  });
});

export default emptyType;

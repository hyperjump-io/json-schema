import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const enumUri = "https://json-schema.org/keyword/enum";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const emptyEnum = lintRule({ origin: "jsonschema-lint:empty-enum" }, (tree, file) => {
  visitKeywords(tree, enumUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType === "array" && valueNode.children.length === 0) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' is empty, so nothing is valid against it`, { place: keywordNode.position });
    }
  });
});

export default emptyEnum;

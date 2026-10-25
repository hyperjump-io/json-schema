import { duplicateItems } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const enumUri = "https://json-schema.org/keyword/enum";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const duplicateEnumValues = lintRule({ origin: "jsonschema-lint:duplicate-enum-values", url: "https://hyperjump.io/json-schema/linting/rules/duplicate-enum-values/" }, (tree, file) => {
  visitKeywords(tree, enumUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "array") {
      return;
    }

    const name = keywordNode.children[0].value;
    for (const itemNode of duplicateItems(valueNode)) {
      file.message(`This value is already in '${name}'`, { place: itemNode.position });
    }
  });
});

export default duplicateEnumValues;

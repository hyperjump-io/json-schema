import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const typeUri = "https://spec.openapis.org/oas/3.0/keyword/type";
const itemsUri = "https://json-schema.org/keyword/items";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const arrayWithoutItems = lintRule({ origin: "json-schema-lint:array-without-items", url: "https://hyperjump.io/json-schema/linting/rules/array-without-items/" }, (tree, file) => {
  visitKeywords(tree, typeUri, (typeNode, schemaNode) => {
    const valueNode = typeNode.children[1];
    if (valueNode.jsonType !== "string" || valueNode.value !== "array" || findKeyword(schemaNode, itemsUri) !== undefined) {
      return;
    }

    file.message(`'${typeNode.children[0].value}' is 'array' without 'items', which OpenAPI 3.0 requires`, { place: typeNode.position });
  });
});

export default arrayWithoutItems;

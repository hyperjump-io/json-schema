import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const additionalItemsUri = "https://json-schema.org/keyword/draft-2019-09/additionalItems";
const itemsUri = "https://json-schema.org/keyword/draft-2019-09/items";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const additionalItemsWithoutItemsArray = lintRule({ origin: "json-schema-lint:additional-items-without-items-array", url: "https://hyperjump.io/json-schema/linting/rules/additional-items-without-items-array/" }, (tree, file) => {
  visitKeywords(tree, additionalItemsUri, (keywordNode, schemaNode) => {
    const name = keywordNode.children[0].value;
    const itemsNode = findKeyword(schemaNode, itemsUri);
    if (itemsNode === undefined) {
      file.message(`'${name}' has no effect without 'items'`, { place: keywordNode.position });
    } else if (itemsNode.children[1].jsonType === "object" || itemsNode.children[1].jsonType === "boolean") {
      const itemsName = itemsNode.children[0].value;
      file.message(`'${name}' has no effect when '${itemsName}' is a schema, not an array of schemas`, { place: keywordNode.position });
    }
  });
});

export default additionalItemsWithoutItemsArray;

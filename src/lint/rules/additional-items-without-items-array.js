import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const additionalItemsUri = "https://json-schema.org/keyword/draft-2019-09/additionalItems";
const itemsUri = "https://json-schema.org/keyword/draft-2019-09/items";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const additionalItemsWithoutItemsArray = lintRule({ origin: "jsonschema-lint:additional-items-without-items-array" }, (tree, file) => {
  visitKeywords(tree, additionalItemsUri, (keywordNode, schemaNode) => {
    const name = keywordNode.children[0].value;
    const itemsNode = findKeyword(schemaNode, itemsUri);
    if (itemsNode === undefined) {
      file.message(`'${name}' has no effect without 'items'`, { place: keywordNode.position });
    } else if (itemsNode.children[1].jsonType !== "array") {
      const itemsName = itemsNode.children[0].value;
      file.message(`'${name}' has no effect when '${itemsName}' is a schema, not an array of schemas`, { place: keywordNode.position });
    }
  });
});

export default additionalItemsWithoutItemsArray;

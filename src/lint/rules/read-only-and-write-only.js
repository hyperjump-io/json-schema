import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const readOnlyUri = "https://json-schema.org/keyword/readOnly";
const writeOnlyUri = "https://json-schema.org/keyword/writeOnly";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const readOnlyAndWriteOnly = lintRule({ origin: "jsonschema-lint:read-only-and-write-only" }, (tree, file) => {
  visitKeywords(tree, readOnlyUri, (readOnlyNode, schemaNode) => {
    const writeOnlyNode = findKeyword(schemaNode, writeOnlyUri);
    if (writeOnlyNode === undefined || !isTrue(readOnlyNode) || !isTrue(writeOnlyNode)) {
      return;
    }

    const readOnlyName = readOnlyNode.children[0].value;
    const writeOnlyName = writeOnlyNode.children[0].value;
    // On whichever comes second, the one that contradicts the other
    const place = /** @type number */ (readOnlyNode.position?.start.offset) < /** @type number */ (writeOnlyNode.position?.start.offset)
      ? writeOnlyNode.position
      : readOnlyNode.position;
    file.message(`'${readOnlyName}' and '${writeOnlyName}' are both true, so the value is never retrieved and can't be changed`, { place });
  });
});

export default readOnlyAndWriteOnly;

/** @type (keywordNode: JsonSchemaKeywordNode) => boolean */
const isTrue = (keywordNode) => {
  const valueNode = keywordNode.children[1];
  return valueNode.jsonType === "boolean" && valueNode.value;
};

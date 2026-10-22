import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const readOnlyUri = "https://json-schema.org/keyword/readOnly";
const writeOnlyUri = "https://json-schema.org/keyword/writeOnly";

/** @type (keywordNode: JsonSchemaKeywordNode) => boolean */
const isTrue = (keywordNode) => {
  const valueNode = keywordNode.children[1];
  return valueNode.jsonType === "boolean" && valueNode.value;
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const readOnlyAndWriteOnly = lintRule({ origin: "jsonschema-lint:read-only-and-write-only" }, (tree, file) => {
  visitKeywords(tree, readOnlyUri, (readOnlyNode, schemaNode) => {
    if (!isTrue(readOnlyNode) || schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (keywordNode.keywordUri === writeOnlyUri && isTrue(keywordNode)) {
        const readOnlyName = readOnlyNode.children[0].value;
        const writeOnlyName = keywordNode.children[0].value;
        // On whichever comes second, the one that contradicts the other
        const place = /** @type number */ (readOnlyNode.position?.start.offset) < /** @type number */ (keywordNode.position?.start.offset)
          ? keywordNode.position
          : readOnlyNode.position;
        file.message(`'${readOnlyName}' and '${writeOnlyName}' are both true, so the value is never retrieved and can't be changed`, { place });
      }
    }
  });
});

export default readOnlyAndWriteOnly;

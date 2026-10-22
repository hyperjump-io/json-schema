import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const containsUri = "https://json-schema.org/keyword/contains";
const maxContainsUri = "https://json-schema.org/keyword/maxContains";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const minContainsZeroWithoutMaxContains = lintRule({ origin: "jsonschema-lint:min-contains-zero-without-max-contains" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/minContains", (keywordNode, schemaNode) => {
    const valueNode = keywordNode.children[1];
    // Without `contains`, min-max-contains-without-contains reports it
    if (valueNode.jsonType === "number" && valueNode.value === 0
      && siblingKeyword(schemaNode, containsUri) !== undefined
      && siblingKeyword(schemaNode, maxContainsUri) === undefined) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' is 0 and there's no 'maxContains', so 'contains' never fails`, { place: keywordNode.position });
    }
  });
});

export default minContainsZeroWithoutMaxContains;

import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const containsUri = "https://json-schema.org/keyword/contains";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const minMaxContainsWithoutContains = lintRule({ origin: "json-schema-lint:min-max-contains-without-contains", url: "https://hyperjump.io/json-schema/linting/rules/min-max-contains-without-contains/" }, (tree, file) => {
  for (const keywordUri of ["https://json-schema.org/keyword/minContains", "https://json-schema.org/keyword/maxContains"]) {
    visitKeywords(tree, keywordUri, (keywordNode, schemaNode) => {
      if (siblingKeyword(schemaNode, containsUri) === undefined) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has no effect without 'contains'`, { place: keywordNode.position });
      }
    });
  }
});

export default minMaxContainsWithoutContains;

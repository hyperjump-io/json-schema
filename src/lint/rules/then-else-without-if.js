import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const ifUri = "https://json-schema.org/keyword/if";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const thenElseWithoutIf = lintRule({ origin: "json-schema-lint:then-else-without-if", url: "https://hyperjump.io/json-schema/linting/rules/then-else-without-if/" }, (tree, file) => {
  for (const keywordUri of ["https://json-schema.org/keyword/then", "https://json-schema.org/keyword/else"]) {
    visitKeywords(tree, keywordUri, (keywordNode, schemaNode) => {
      if (siblingKeyword(schemaNode, ifUri) === undefined) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has no effect without 'if'`, { place: keywordNode.position });
      }
    });
  }
});

export default thenElseWithoutIf;

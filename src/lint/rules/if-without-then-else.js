import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const ifUri = "https://json-schema.org/keyword/if";
const thenUri = "https://json-schema.org/keyword/then";
const elseUri = "https://json-schema.org/keyword/else";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const ifWithoutThenElse = lintRule({ origin: "jsonschema-lint:if-without-then-else" }, (tree, file) => {
  visitKeywords(tree, ifUri, (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, thenUri) === undefined && siblingKeyword(schemaNode, elseUri) === undefined) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' without 'then' or 'else' only collects annotations`, { place: keywordNode.position });
    }
  });
});

export default ifWithoutThenElse;

import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const nullableUri = "https://spec.openapis.org/oas/3.0/keyword/nullable";
const typeUri = "https://spec.openapis.org/oas/3.0/keyword/type";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const nullableWithoutType = lintRule({ origin: "json-schema-lint:nullable-without-type", url: "https://hyperjump.io/json-schema/linting/rules/nullable-without-type/" }, (tree, file) => {
  visitKeywords(tree, nullableUri, (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, typeUri) === undefined) {
      file.message(`'${keywordNode.children[0].value}' has no effect without 'type'`, { place: keywordNode.position });
    }
  });
});

export default nullableWithoutType;

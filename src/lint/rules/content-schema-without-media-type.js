import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const contentSchemaUri = "https://json-schema.org/keyword/contentSchema";
const contentMediaTypeUri = "https://json-schema.org/keyword/contentMediaType";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const contentSchemaWithoutMediaType = lintRule({ origin: "jsonschema-lint:content-schema-without-media-type", url: "https://hyperjump.io/json-schema/linting/rules/content-schema-without-media-type/" }, (tree, file) => {
  visitKeywords(tree, contentSchemaUri, (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, contentMediaTypeUri) === undefined) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' has no effect without 'contentMediaType'`, { place: keywordNode.position });
    }
  });
});

export default contentSchemaWithoutMediaType;

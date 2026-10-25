import { duplicateItems } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const oneOfUri = "https://json-schema.org/keyword/oneOf";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const duplicateOneOfSchemas = lintRule({ origin: "jsonschema-lint:duplicate-one-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/duplicate-one-of-schemas/" }, (tree, file) => {
  visitKeywords(tree, oneOfUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "array") {
      return;
    }

    const name = keywordNode.children[0].value;
    for (const schemaNode of duplicateItems(valueNode)) {
      file.message(`This schema is already in '${name}', so a value it matches always fails '${name}'`, { place: schemaNode.position });
    }
  });
});

export default duplicateOneOfSchemas;

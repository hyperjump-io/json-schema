import { duplicateItems } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const duplicateAllOfAnyOfSchemas = lintRule({ origin: "jsonschema-lint:duplicate-all-of-any-of-schemas" }, (tree, file) => {
  for (const keywordUri of ["https://json-schema.org/keyword/allOf", "https://json-schema.org/keyword/anyOf"]) {
    visitKeywords(tree, keywordUri, (keywordNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "array") {
        return;
      }

      const name = keywordNode.children[0].value;
      for (const schemaNode of duplicateItems(valueNode)) {
        file.message(`This schema is already in '${name}', so it has no effect`, { place: schemaNode.position });
      }
    });
  }
});

export default duplicateAllOfAnyOfSchemas;

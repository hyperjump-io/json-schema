import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const dependencyUris = [
  "https://json-schema.org/keyword/dependentRequired",
  "https://json-schema.org/keyword/dependentSchemas",
  "https://json-schema.org/keyword/draft-07/dependencies",
  "https://json-schema.org/keyword/draft-04/dependencies"
];

const requiredUris = [
  "https://json-schema.org/keyword/required",
  "https://json-schema.org/keyword/draft-04/required"
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const dependencyOnRequiredProperty = lintRule({ origin: "jsonschema-lint:dependency-on-required-property" }, (tree, file) => {
  for (const dependencyUri of dependencyUris) {
    visitKeywords(tree, dependencyUri, (keywordNode, schemaNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "object") {
        return;
      }

      /** @type Set<string> */
      const required = new Set();
      for (const requiredUri of requiredUris) {
        const requiredNode = siblingKeyword(schemaNode, requiredUri);
        if (requiredNode?.jsonType === "array") {
          for (const itemNode of requiredNode.children) {
            if (itemNode.jsonType === "string") {
              required.add(itemNode.value);
            }
          }
        }
      }

      for (const property of valueNode.children) {
        const name = property.children[0].value;
        if (required.has(name)) {
          file.message(`'${name}' is required, so this dependency always applies`, { place: property.position });
        }
      }
    });
  }
});

export default dependencyOnRequiredProperty;

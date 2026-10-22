import { lintRule } from "../lint-rule.js";
import { requiredNames, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const dependencyUris = [
  "https://json-schema.org/keyword/dependentRequired",
  "https://json-schema.org/keyword/dependentSchemas",
  "https://json-schema.org/keyword/draft-07/dependencies",
  "https://json-schema.org/keyword/draft-04/dependencies"
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const dependencyOnRequiredProperty = lintRule({ origin: "jsonschema-lint:dependency-on-required-property" }, (tree, file) => {
  for (const dependencyUri of dependencyUris) {
    visitKeywords(tree, dependencyUri, (keywordNode, schemaNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "object") {
        return;
      }

      const required = requiredNames(schemaNode)?.names ?? new Set();

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

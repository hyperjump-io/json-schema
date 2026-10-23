import { lintRule } from "../lint-rule.js";
import { requiredNames, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const dependencyUris = [
  "https://json-schema.org/keyword/dependentRequired",
  "https://json-schema.org/keyword/draft-07/dependencies",
  "https://json-schema.org/keyword/draft-04/dependencies"
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const requiredDependentProperty = lintRule({ origin: "jsonschema-lint:required-dependent-property" }, (tree, file) => {
  for (const dependencyUri of dependencyUris) {
    visitKeywords(tree, dependencyUri, (keywordNode, schemaNode) => {
      const valueNode = keywordNode.children[1];
      const required = requiredNames(schemaNode);
      if (valueNode.jsonType !== "object" || required === undefined) {
        return;
      }

      const requiredName = required.keywordNode.children[0].value;
      for (const property of valueNode.children) {
        // A dependency on a required property is reported by
        // dependency-on-required-property
        const dependentsNode = property.children[1];
        if (required.names.has(property.children[0].value) || dependentsNode.jsonType !== "array") {
          continue;
        }

        for (const itemNode of dependentsNode.children) {
          if (itemNode.jsonType === "string" && required.names.has(itemNode.value)) {
            file.message(`'${itemNode.value}' is in '${requiredName}', so requiring it here has no effect`, { place: itemNode.position });
          }
        }
      }
    });
  }
});

export default requiredDependentProperty;

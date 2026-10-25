import { lintRule } from "../lint-rule.js";
import { propertySchemas, requiredNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const requiredPropertyNotAllowed = lintRule({ origin: "jsonschema-lint:required-property-not-allowed", url: "https://hyperjump.io/json-schema/linting/rules/required-property-not-allowed/" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    const required = requiredNames(schemaNode);
    const requiredValue = required?.keywordNode.children[1];
    if (required === undefined || requiredValue?.jsonType !== "array") {
      return;
    }

    for (const itemNode of requiredValue.children) {
      if (itemNode.jsonType !== "string") {
        continue;
      }

      const schemas = propertySchemas(schemaNode, itemNode.value) ?? [];
      const rejecting = schemas.find(({ valueNode }) => valueNode.jsonType === "boolean" && !valueNode.value);
      if (rejecting !== undefined) {
        const keywordName = rejecting.keywordNode.children[0].value;
        file.message(`'${itemNode.value}' is required, but '${keywordName}' doesn't allow it, so no object is valid`, { place: itemNode.position });
      }
    }
  });
});

export default requiredPropertyNotAllowed;

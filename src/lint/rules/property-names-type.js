import { lintRule } from "../lint-rule.js";
import { typeNames, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const propertyNamesType = lintRule({ origin: "json-schema-lint:property-names-type", url: "https://hyperjump.io/json-schema/linting/rules/property-names-type/" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/propertyNames", (keywordNode) => {
    const schemaNode = /** @type JsonSchemaNode */ (keywordNode.children[1]);
    const type = schemaNode.type === "json-schema" ? typeNames(schemaNode) : undefined;
    if (type === undefined) {
      return;
    }

    const name = type.keywordNode.children[0].value;
    const propertyNames = keywordNode.children[0].value;
    if (type.names.has("string")) {
      file.message(`'${name}' has no effect in '${propertyNames}', because property names are always strings`, { place: type.keywordNode.position });
    } else {
      file.message(`'${name}' doesn't allow strings, so no property name is valid, and only objects without properties are`, { place: type.keywordNode.position });
    }
  });
});

export default propertyNamesType;

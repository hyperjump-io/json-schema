import { lintRule } from "../lint-rule.js";
import { requiredNames, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const minPropertiesUri = "https://json-schema.org/keyword/minProperties";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const minPropertiesCoveredByRequired = lintRule({ origin: "json-schema-lint:min-properties-covered-by-required", url: "https://hyperjump.io/json-schema/linting/rules/min-properties-covered-by-required/" }, (tree, file) => {
  visitKeywords(tree, minPropertiesUri, (keywordNode, schemaNode) => {
    const valueNode = keywordNode.children[1];
    const required = requiredNames(schemaNode);
    if (valueNode.jsonType !== "number" || required === undefined || valueNode.value > required.names.size) {
      return;
    }

    const name = keywordNode.children[0].value;
    const requiredName = required.keywordNode.children[0].value;
    const count = required.names.size === 1 ? "1 property" : `${required.names.size} properties`;
    file.message(`'${name}' has no effect, because '${requiredName}' already requires ${count}`, { place: keywordNode.position });
  });
});

export default minPropertiesCoveredByRequired;

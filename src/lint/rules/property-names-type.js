import { operationsOf, typeIsOf } from "../analysis.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/**
 * A schema for property names is one `eachPropertyName` applies, and `type`
 * is a keyword in it that lowers to `typeIs`, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const propertyNamesType = lintRule({ origin: "json-schema-lint:property-names-type", url: "https://hyperjump.io/json-schema/linting/rules/property-names-type/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);

  /** @type Map<string, LoweredKeyword[]> */
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));

  /** @type Map<string, JsonSchemaKeywordNode> */
  const propertyNamesSchemas = new Map();
  for (const keywords of lowered.values()) {
    for (const { group, keywordNode } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op === "eachPropertyName" && operation.of.op === "apply") {
          propertyNamesSchemas.set(operation.of.schema, keywordNode);
        }
      }
    }
  }

  for (const [location, keywordNode] of propertyNamesSchemas) {
    const type = typeIsOf(schemas.get(location) ?? []);
    if (type === undefined) {
      continue;
    }

    const name = type.keywordNode.children[0].value;
    const propertyNames = keywordNode.children[0].value;
    if (type.types.has("string")) {
      file.message(`'${name}' has no effect in '${propertyNames}', because property names are always strings`, { place: type.keywordNode.position });
    } else {
      file.message(`'${name}' doesn't allow strings, so no property name is valid, and only objects without properties are`, { place: type.keywordNode.position });
    }
  }
});

export default propertyNamesType;

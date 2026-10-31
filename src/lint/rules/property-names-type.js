import { operationsOf, typeIsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/**
 * A schema for property names is one `eachPropertyName` applies, and `type`
 * is a keyword in it that lowers to `typeIs`, so no keyword is named. With
 * more than one, each is reported.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const propertyNamesType = lintRule({ origin: "json-schema-lint:property-names-type", url: "https://hyperjump.io/json-schema/linting/rules/property-names-type/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;

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

    // If they all allow strings, each has no effect. If not, the ones that don't are why.
    const propertyNames = keywordNode.children[0].value;
    for (const { keywordNode: typeNode, types } of type.keywords) {
      const name = typeNode.children[0].value;
      if (type.types.has("string")) {
        file.message(`'${name}' has no effect in '${propertyNames}', because property names are always strings`, { place: typeNode.position });
      } else if (!types.has("string")) {
        file.message(`'${name}' doesn't allow strings, so no property name is valid, and only objects without properties are`, { place: typeNode.position });
      }
    }
  }
});

export default propertyNamesType;

import { operationsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { list } from "../list.js";
import { fewestProperties, propertyAlternatives } from "../required-properties.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * A minimum is `propertyCount`'s `min`, and required properties are what
 * the schema's other keywords require (`propertyAlternatives`), so no
 * keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const minPropertiesCoveredByRequired = lintRule({ origin: "json-schema-lint:min-properties-covered-by-required", url: "https://hyperjump.io/json-schema/linting/rules/min-properties-covered-by-required/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    for (const keyword of keywords) {
      // A maximum from the same keyword has an effect of its own
      const min = operationsOf(keyword.group.expression)
        .find((operation) => operation.op === "propertyCount" && operation.min !== undefined && operation.max === undefined);
      if (min?.op !== "propertyCount" || min.min === undefined) {
        continue;
      }

      // If no object is valid, contradictory-limits reports it
      const alternatives = propertyAlternatives(schemaNode, keywords.filter((other) => other !== keyword), schemas);
      const fewest = alternatives.length > 0 ? fewestProperties(alternatives) : undefined;
      if (fewest === undefined || fewest.count < min.min) {
        continue;
      }

      const requiring = new Set(alternatives.flatMap(({ keywordNodes }) => [...keywordNodes]));
      const children = /** @type JsonSchemaKeywordNode[] */ (schemaNode.jsonType === "object" ? schemaNode.children : []);
      const names = children.filter((keywordNode) => requiring.has(keywordNode)).map((keywordNode) => `'${keywordNode.children[0].value}'`);
      const requires = names.length === 1 ? "requires" : "require";
      const properties = fewest.count === 1 ? "property" : "properties";
      const count = fewest.exact ? `${fewest.count} ${properties}` : `at least ${fewest.count} ${properties}`;
      const name = keyword.keywordNode.children[0].value;
      file.message(`'${name}' has no effect, because ${list(names)} already ${requires} ${count}`, { place: keyword.keywordNode.position });
    }
  }
});

export default minPropertiesCoveredByRequired;

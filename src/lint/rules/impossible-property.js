import { operationsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { fewestProperties, propertyAlternatives } from "../required-properties.js";
import { nodeFor } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const impossibleProperty = lintRule({ origin: "json-schema-lint:impossible-property", url: "https://hyperjump.io/json-schema/linting/rules/impossible-property/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    const max = mostProperties(keywords);
    if (max === undefined) {
      continue;
    }

    // If no object is valid, `contradictory-limits` reports it
    const alternatives = propertyAlternatives(schemaNode, keywords, schemas);
    if (alternatives.length === 0 || fewestProperties(alternatives).count > max.value) {
      continue;
    }

    /** @type Map<string, JsonSchemaKeywordNode[]> */
    const mentions = new Map();
    for (const { group, keywordNode } of keywords) {
      for (const name of namesOf(group.expression)) {
        mentions.set(name, [...mentions.get(name) ?? [], keywordNode]);
      }
    }

    for (const [name, keywordNodes] of mentions) {
      // A property every valid object has can't be impossible here
      if (alternatives.every(({ names }) => names.has(name))) {
        continue;
      }

      // An object with it that can pass at all has too many properties
      const withName = propertyAlternatives(schemaNode, keywords, schemas, [name]);
      const fewest = withName.length > 0 ? fewestProperties(withName) : undefined;
      if (fewest === undefined || fewest.count <= max.value) {
        continue;
      }

      const count = fewest.exact ? `${fewest.count}` : `at least ${fewest.count}`;
      const maxName = `'${max.keywordNode.children[0].value}'`;
      const reason = `An object with '${name}' needs ${count} properties, but ${maxName} allows at most ${max.value}, so no valid object has '${name}'`;
      file.message(reason, { place: max.keywordNode.position });
      for (const keywordNode of new Set(keywordNodes)) {
        file.message(reason, { place: (nodeFor(keywordNode, name) ?? keywordNode).position });
      }
    }
  }
});

export default impossibleProperty;

/**
 * The properties a keyword is about without requiring them: ones it applies
 * a schema to (`properties`), ones it makes something depend on
 * (`dependentRequired`, `dependencies`), and ones a switch is by
 *
 * @type (expression: Expression) => string[]
 */
const namesOf = (expression) => operationsOf(expression).flatMap((operation) => {
  if (operation.op === "property") {
    return [operation.name];
  } else if (operation.op === "cases") {
    return operation.cases.flatMap(([condition]) => operationsOf(condition))
      .flatMap((condition) => condition.op === "hasProperty" ? [condition.name] : []);
  } else if (operation.op === "typeSwitch") {
    return namesOf(operation.cases.object ?? operation.otherwise);
  } else if (operation.op === "propertySwitch") {
    return [operation.name];
  } else if (operation.op === "keySwitch") {
    return operation.cases.map(([name]) => name);
  }

  return [];
});

/**
 * The tightest `maxProperties`, from whichever keyword lowered to it
 *
 * @type (keywords: LoweredKeyword[]) => { value: number; keywordNode: JsonSchemaKeywordNode } | undefined
 */
const mostProperties = (keywords) => {
  let result;
  for (const { group, keywordNode } of keywords) {
    for (const operation of operationsOf(group.expression)) {
      if (operation.op === "propertyCount" && operation.max !== undefined && (result === undefined || operation.max < result.value)) {
        result = { value: operation.max, keywordNode };
      }
    }
  }

  return result;
};

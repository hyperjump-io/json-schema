import { operationsOf } from "../analysis.js";
import { boundsOf, namesOf, second, tightestMax, tightestMin } from "../bounds.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { fewestProperties, propertyAlternatives } from "../required-properties.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * Limits are what `range`, `stringLength`, `itemCount`, `propertyCount`
 * (`boundsOf`), and `contains` say, from whichever keywords lowered to them,
 * and required properties are `hasProperty`, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const contradictoryLimits = lintRule({ origin: "json-schema-lint:contradictory-limits", url: "https://hyperjump.io/json-schema/linting/rules/contradictory-limits/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    const bounds = boundsOf(keywords);
    /** @type [string, JsonSchemaKeywordNode][] */
    const containsMessages = [];

    for (const { group, keywordNode, cameFrom } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op === "contains" && operation.max !== null && operation.min > operation.max) {
          // A limit that came from `contains` alone is what it has without
          // one (`min: 1`), so it's said as what `contains` requires
          const minNodes = cameFrom(operation, "min");
          const maxNodes = cameFrom(operation, "max");
          const maxNode = /** @type JsonSchemaKeywordNode */ (maxNodes.at(-1));
          if (!minNodes.includes(keywordNode) && !maxNodes.includes(keywordNode)) {
            const place = second(/** @type JsonSchemaKeywordNode */ (minNodes.at(-1)), maxNode);
            containsMessages.push([`${namesOf(minNodes)} is greater than ${namesOf(maxNodes)}, so no array is valid`, place]);
          } else if (!maxNodes.includes(keywordNode)) {
            const items = operation.min === 1 ? "item" : "items";
            const requires = `${namesOf(minNodes)} requires at least ${operation.min} matching ${items}`;
            containsMessages.push([`${namesOf(maxNodes)} is ${operation.max}, but ${requires}, so no array is valid`, maxNode]);
          }
        }
      }
    }

    const min = tightestMin(bounds.number.min);
    const max = tightestMax(bounds.number.max);
    if (min && max) {
      const place = second(min.keywordNode, max.keywordNode).position;
      if (min.value > max.value) {
        file.message(`${min.label} is greater than ${max.label}, so no number is valid`, { place });
      } else if (min.value === max.value && (min.exclusive || max.exclusive)) {
        file.message(`${min.label} is equal to ${max.label}, so no number is valid`, { place });
      }
    }

    for (const type of /** @type const */ (["string", "array", "object"])) {
      const countMin = tightestMin(bounds[type].min);
      const countMax = tightestMax(bounds[type].max);
      if (countMin && countMax && countMin.value > countMax.value) {
        const place = second(countMin.keywordNode, countMax.keywordNode).position;
        file.message(`${countMin.label} is greater than ${countMax.label}, so no ${type} is valid`, { place });
      }
    }

    for (const [reason, node] of containsMessages) {
      file.message(reason, { place: node.position });
    }

    // Every way to pass the schema requires more properties than are
    // allowed. The message on the limit doesn't name the keywords that
    // require them, and each of those names the others, so it's clear any of
    // them could change.
    const maxProperties = tightestMax(bounds.object.max);
    const alternatives = maxProperties ? propertyAlternatives(schemaNode, keywords, schemas) : [];
    const fewest = alternatives.length > 0 ? fewestProperties(alternatives) : undefined;
    if (maxProperties && fewest && fewest.count > maxProperties.value) {
      const count = fewest.exact ? `${fewest.count}` : `at least ${fewest.count}`;
      const allowed = `but ${maxProperties.label} allows at most ${maxProperties.value}, so no object is valid`;
      file.message(`${count} properties are required, ${allowed}`, { place: maxProperties.keywordNode.position });

      const requiring = new Set(alternatives.flatMap(({ keywordNodes }) => [...keywordNodes]));
      const children = /** @type JsonSchemaKeywordNode[] */ (schemaNode.jsonType === "object" ? schemaNode.children : []);
      const keywordNodes = children.filter((keywordNode) => requiring.has(keywordNode));
      for (const keywordNode of keywordNodes) {
        const others = keywordNodes.filter((other) => other !== keywordNode);
        const requires = others.length === 0 ? "requires" : "require";
        file.message(`${list([keywordNode, ...others].map(nameOf))} ${requires} ${count} properties, ${allowed}`, { place: keywordNode.position });
      }
    }
  }
});

export default contradictoryLimits;

/** @type (keywordNode: JsonSchemaKeywordNode) => string */
const nameOf = (keywordNode) => `'${keywordNode.children[0].value}'`;

/**
 * Names, like "'a', 'b', and 'c'"
 *
 * @type (names: string[]) => string
 */
const list = (names) => names.length < 3
  ? names.join(" and ")
  : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

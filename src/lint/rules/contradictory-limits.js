import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { fewestProperties, propertyAlternatives } from "../required-properties.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/**
 * @typedef {{
 *   value: number;
 *   exclusive: boolean;
 *   label: string;
 *   keywordNode: JsonSchemaKeywordNode;
 * }} Bound
 */

/** The operations that limit a count, and what they count */
const counts = /** @type const */ ({ stringLength: "string", itemCount: "array", propertyCount: "object" });

/** @type (keywordNode: JsonSchemaKeywordNode) => string */
const nameOf = (keywordNode) => `'${keywordNode.children[0].value}'`;

/** @type (keywordNodes: JsonSchemaKeywordNode[]) => string */
const namesOf = (keywordNodes) => keywordNodes.map(nameOf).join(" and ");

/**
 * A group's operations, from its top-level `all`
 *
 * @type (expression: Expression) => Expression[]
 */
const operations = (expression) => expression.op === "all" ? expression.of : [expression];

/**
 * Names, like "'a', 'b', and 'c'"
 *
 * @type (names: string[]) => string
 */
const list = (names) => names.length < 3
  ? names.join(" and ")
  : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

/**
 * The bound that allows the least. On a tie, an exclusive bound allows less.
 *
 * @type (bounds: Bound[], isTighter: (a: number, b: number) => boolean) => Bound | undefined
 */
const tightest = (bounds, isTighter) => {
  let result;
  for (const candidate of bounds) {
    if (result === undefined || isTighter(candidate.value, result.value) || (candidate.value === result.value && candidate.exclusive)) {
      result = candidate;
    }
  }

  return result;
};

/**
 * The second of two keywords in the document. The message goes on it,
 * because it's the one that contradicts the other.
 *
 * @type (a: JsonSchemaKeywordNode, b: JsonSchemaKeywordNode) => JsonSchemaKeywordNode
 */
const second = (a, b) => {
  return /** @type number */ (a.position?.start.offset) < /** @type number */ (b.position?.start.offset) ? b : a;
};

/**
 * Limits are what `range`, `stringLength`, `itemCount`, `propertyCount`, and
 * `contains` say, from whichever keywords lowered to them, and required
 * properties are `hasProperty`, so no keyword is named. A limit's label is
 * the keywords it came from, with the ones that made it exclusive when
 * they're others (draft-04's `exclusiveMinimum`).
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const contradictoryLimits = lintRule({ origin: "jsonschema-lint:contradictory-limits" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    /** @type Bound[] */
    const lower = [];
    /** @type Bound[] */
    const upper = [];
    /** @type Record<string, Bound[]> */
    const mins = { string: [], array: [], object: [] };
    /** @type Record<string, Bound[]> */
    const maxes = { string: [], array: [], object: [] };
    /** @type [string, JsonSchemaKeywordNode][] */
    const containsMessages = [];

    for (const { group, keywordNode, cameFrom } of keywords) {
      /**
       * A limit, from the keywords its field came from
       *
       * @type (operation: Expression, field: string, value: number, exclusiveField?: string) => Bound
       */
      const bound = (operation, field, value, exclusiveField) => {
        const limitNodes = cameFrom(operation, field);
        const exclusiveNodes = (exclusiveField === undefined ? [] : cameFrom(operation, exclusiveField))
          .filter((exclusiveNode) => !limitNodes.includes(exclusiveNode));
        return {
          value,
          exclusive: exclusiveField !== undefined,
          label: exclusiveNodes.length > 0 ? `${namesOf(limitNodes)} with ${namesOf(exclusiveNodes)}` : namesOf(limitNodes),
          keywordNode: /** @type JsonSchemaKeywordNode */ (limitNodes.at(-1))
        };
      };

      for (const operation of operations(group.expression)) {
        if (operation.op === "range") {
          if (operation.min !== undefined) {
            lower.push(bound(operation, "min", operation.min, operation.exclusiveMin ? "exclusiveMin" : undefined));
          }
          if (operation.max !== undefined) {
            upper.push(bound(operation, "max", operation.max, operation.exclusiveMax ? "exclusiveMax" : undefined));
          }
        } else if (operation.op === "stringLength" || operation.op === "itemCount" || operation.op === "propertyCount") {
          const type = counts[operation.op];
          if (operation.min !== undefined) {
            mins[type].push(bound(operation, "min", operation.min));
          }
          if (operation.max !== undefined) {
            maxes[type].push(bound(operation, "max", operation.max));
          }
        } else if (operation.op === "contains" && operation.max !== null && operation.min > operation.max) {
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

    const min = tightest(lower, (a, b) => a > b);
    const max = tightest(upper, (a, b) => a < b);
    if (min && max) {
      const place = second(min.keywordNode, max.keywordNode).position;
      if (min.value > max.value) {
        file.message(`${min.label} is greater than ${max.label}, so no number is valid`, { place });
      } else if (min.value === max.value && (min.exclusive || max.exclusive)) {
        file.message(`${min.label} is equal to ${max.label}, so no number is valid`, { place });
      }
    }

    for (const type of ["string", "array", "object"]) {
      const countMin = tightest(mins[type], (a, b) => a > b);
      const countMax = tightest(maxes[type], (a, b) => a < b);
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
    const maxProperties = tightest(maxes.object, (a, b) => a < b);
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

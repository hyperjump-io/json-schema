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
 * its keyword's name, with the siblings it read when they made it exclusive
 * (draft-04's `exclusiveMinimum`).
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

    for (const lowered of keywords) {
      const { keywordNode, sourceNodes } = lowered;
      for (const operation of operations(lowered.group.expression)) {
        if (operation.op === "range") {
          /** @type (exclusive: boolean) => string */
          const label = (exclusive) => exclusive && sourceNodes.length > 0
            ? `${nameOf(keywordNode)} with ${sourceNodes.map(nameOf).join(" and ")}`
            : nameOf(keywordNode);
          if (operation.min !== undefined) {
            const exclusive = operation.exclusiveMin ?? false;
            lower.push({ value: operation.min, exclusive, label: label(exclusive), keywordNode });
          }
          if (operation.max !== undefined) {
            const exclusive = operation.exclusiveMax ?? false;
            upper.push({ value: operation.max, exclusive, label: label(exclusive), keywordNode });
          }
        } else if (operation.op === "stringLength" || operation.op === "itemCount" || operation.op === "propertyCount") {
          const type = counts[operation.op];
          if (operation.min !== undefined) {
            mins[type].push({ value: operation.min, exclusive: false, label: nameOf(keywordNode), keywordNode });
          }
          if (operation.max !== undefined) {
            maxes[type].push({ value: operation.max, exclusive: false, label: nameOf(keywordNode), keywordNode });
          }
        } else if (operation.op === "contains" && operation.max !== null && operation.min > operation.max && sourceNodes.length === 2) {
          // The limits are from its siblings, in the order it declares them
          const [minNode, maxNode] = sourceNodes;
          containsMessages.push([`${nameOf(minNode)} is greater than ${nameOf(maxNode)}, so no array is valid`, second(minNode, maxNode)]);
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

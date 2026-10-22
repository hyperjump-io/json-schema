import { lintRule } from "../lint-rule.js";
import { findKeyword, siblingKeyword, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * @typedef {{
 *   value: number;
 *   exclusive: boolean;
 *   label: string;
 *   keywordNode: JsonSchemaKeywordNode;
 * }} Bound
 */

const keyword = "https://json-schema.org/keyword";

/** Limits that are counts: the lower limit, the upper limit, what they limit, and what they need */
const countLimits = [
  [`${keyword}/minLength`, `${keyword}/maxLength`, "string"],
  [`${keyword}/minItems`, `${keyword}/maxItems`, "array"],
  [`${keyword}/minProperties`, `${keyword}/maxProperties`, "object"],
  [`${keyword}/minContains`, `${keyword}/maxContains`, "array", `${keyword}/contains`]
];

/** @type (keywordNode: JsonSchemaKeywordNode) => string */
const nameOf = (keywordNode) => `'${keywordNode.children[0].value}'`;

/** @type (keywordNode: JsonSchemaKeywordNode | undefined, exclusive: boolean, label?: string) => Bound | undefined */
const bound = (keywordNode, exclusive, label) => {
  const valueNode = keywordNode?.children[1];
  if (keywordNode === undefined || valueNode?.jsonType !== "number") {
    return;
  }

  return { value: valueNode.value, exclusive, label: label ?? nameOf(keywordNode), keywordNode };
};

/**
 * Draft-04's `minimum` or `maximum`, which its sibling boolean makes
 * exclusive
 *
 * @type (schemaNode: JsonSchemaNode, limitUri: string, exclusiveUri: string) => Bound | undefined
 */
const draft04Bound = (schemaNode, limitUri, exclusiveUri) => {
  const keywordNode = findKeyword(schemaNode, limitUri);
  const exclusiveNode = findKeyword(schemaNode, exclusiveUri);
  const exclusiveValueNode = exclusiveNode?.children[1];
  const exclusive = exclusiveValueNode?.jsonType === "boolean" && exclusiveValueNode.value;
  const label = keywordNode && exclusiveNode && exclusive ? `${nameOf(keywordNode)} with ${nameOf(exclusiveNode)}` : undefined;
  return bound(keywordNode, exclusive, label);
};

/**
 * The bound that allows the least. On a tie, an exclusive bound allows less.
 *
 * @type (bounds: (Bound | undefined)[], isTighter: (a: number, b: number) => boolean) => Bound | undefined
 */
const tightest = (bounds, isTighter) => {
  let result;
  for (const candidate of bounds) {
    if (candidate === undefined) {
      continue;
    } else if (result === undefined || isTighter(candidate.value, result.value) || (candidate.value === result.value && candidate.exclusive)) {
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

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const contradictoryLimits = lintRule({ origin: "jsonschema-lint:contradictory-limits" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    const lower = tightest([
      bound(findKeyword(schemaNode, `${keyword}/minimum`), false),
      bound(findKeyword(schemaNode, `${keyword}/exclusiveMinimum`), true),
      draft04Bound(schemaNode, `${keyword}/draft-04/minimum`, `${keyword}/draft-04/exclusiveMinimum`)
    ], (a, b) => a > b);
    const upper = tightest([
      bound(findKeyword(schemaNode, `${keyword}/maximum`), false),
      bound(findKeyword(schemaNode, `${keyword}/exclusiveMaximum`), true),
      draft04Bound(schemaNode, `${keyword}/draft-04/maximum`, `${keyword}/draft-04/exclusiveMaximum`)
    ], (a, b) => a < b);

    if (lower && upper) {
      const place = second(lower.keywordNode, upper.keywordNode).position;
      if (lower.value > upper.value) {
        file.message(`${lower.label} is greater than ${upper.label}, so no number is valid`, { place });
      } else if (lower.value === upper.value && (lower.exclusive || upper.exclusive)) {
        file.message(`${lower.label} is equal to ${upper.label}, so no number is valid`, { place });
      }
    }

    for (const [minUri, maxUri, type, requiredUri] of countLimits) {
      if (requiredUri !== undefined && siblingKeyword(schemaNode, requiredUri) === undefined) {
        continue;
      }

      const min = bound(findKeyword(schemaNode, minUri), false);
      const max = bound(findKeyword(schemaNode, maxUri), false);
      if (min && max && min.value > max.value) {
        const place = second(min.keywordNode, max.keywordNode).position;
        file.message(`${min.label} is greater than ${max.label}, so no ${type} is valid`, { place });
      }
    }
  });
});

export default contradictoryLimits;

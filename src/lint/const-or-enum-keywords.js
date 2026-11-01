import { jsonValue } from "@hyperjump/browser";
import { isErrorNode } from "../keywords/checks.js";
import { evaluatorForLint } from "./evaluate.js";
import { marksAreRead, schemaGroup } from "./schema-group.js";

/**
 * @import { JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { LintEvaluation } from "./evaluate.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * A `const` or `enum` and a keyword next to it, with what evaluating each
 * value against the keyword found. `isType` is whether the keyword lowers
 * to `typeIs`. `marksAreRead` is whether something that applies to the same
 * instance might read what the keyword marks.
 *
 * @typedef {{
 *   valuesNode: JsonSchemaKeywordNode;
 *   isConst: boolean;
 *   keywordNode: JsonSchemaKeywordNode;
 *   isType: boolean;
 *   results: [JsonSchemaTolerantNode, LintEvaluation][];
 *   marksAreRead: boolean;
 * }} KeywordResult
 */

/**
 * Results are found once for each document, so rules share them
 *
 * @type WeakMap<LintDocument, KeywordResult[]>
 */
const cache = new WeakMap();

/**
 * Each value of every `const` and `enum` in the document, evaluated against
 * each keyword group next to it (`evaluatorForLint`), one at a time, so
 * what a keyword says about the values doesn't depend on the rest of the
 * schema. A group that reads marks gets what the others marked. Values are
 * what `equals` and `oneOfValues` allow, from whichever keyword lowered to
 * them, so no keyword is named. A schema's first keyword that allows one
 * value (`const`) is its values, or else its first that allows a list of
 * them (`enum`), and the others are keywords next to it, so in a schema
 * with both `const` and `enum`, `enum` is a keyword next to `const`.
 *
 * @type (document: LintDocument) => KeywordResult[]
 */
export const constOrEnumKeywords = (document) => {
  let results = cache.get(document);
  if (results === undefined) {
    results = evaluate(document);
    cache.set(document, results);
  }
  return results;
};

/** @type (document: LintDocument) => KeywordResult[] */
const evaluate = (document) => {
  const lowered = document.schemas;

  /** @type {{ schemaNode: JsonSchemaNode; valuesNode: JsonSchemaKeywordNode; isConst: boolean; valueNodes: JsonSchemaTolerantNode[] }[]} */
  const found = [];
  for (const [schemaNode, keywords] of lowered) {
    const values = keywords.map(valuesOf).filter((values) => values !== undefined);
    const chosen = values.find(({ isConst }) => isConst) ?? values[0];
    if (chosen !== undefined) {
      found.push({ schemaNode, ...chosen });
    }
  }
  if (found.length === 0) {
    return [];
  }

  const evaluator = evaluatorForLint(document);

  /** @type KeywordResult[] */
  const results = [];
  for (const { schemaNode, valuesNode, isConst, valueNodes: allValueNodes } of found) {
    // Values that couldn't be parsed aren't evaluated
    const valueNodes = allValueNodes.filter((valueNode) => !isErrorNode(valueNode));
    const evaluations = valueNodes.map((valueNode) => evaluator.keywords(schemaNode, valueNode));

    // Marks are read by a schema that applies to the same instance, which
    // might be one this document doesn't have
    const marksRead = marksAreRead(document, schemaGroup(document, schemaNode));

    for (const [index, keyword] of (lowered.get(schemaNode) ?? []).entries()) {
      const { group, keywordNode } = keyword;
      if (keywordNode === valuesNode) {
        continue;
      }

      results.push({
        valuesNode,
        isConst,
        keywordNode,
        isType: group.expression.op === "typeIs",
        results: valueNodes.map((valueNode, valueIndex) => [valueNode, evaluations[valueIndex][index][1]]),
        marksAreRead: marksRead
      });
    }
  }

  return results;
};

/**
 * The values a keyword allows, and their nodes: what `equals` allows is
 * one value, and what `oneOfValues` allows is a list. A list of one value
 * (`"enum": [1]`) lowers to `equals` too, so `equals` of an array of one
 * item that isn't the value is a list.
 *
 * @type (keyword: LoweredKeyword) => { valuesNode: JsonSchemaKeywordNode; isConst: boolean; valueNodes: JsonSchemaTolerantNode[] } | undefined
 */
const valuesOf = ({ group, keywordNode }) => {
  const { expression } = group;
  const valueNode = keywordNode.children[1];
  if (expression.op === "oneOfValues") {
    return valueNode.jsonType === "array" ? { valuesNode: keywordNode, isConst: false, valueNodes: valueNode.children } : undefined;
  } else if (expression.op !== "equals") {
    return;
  }

  const isList = valueNode.jsonType === "array" && valueNode.children.length === 1
    && JSON.stringify(jsonValue(valueNode)) !== JSON.stringify(expression.value);
  return isList
    ? { valuesNode: keywordNode, isConst: false, valueNodes: valueNode.children }
    : { valuesNode: keywordNode, isConst: true, valueNodes: [valueNode] };
};

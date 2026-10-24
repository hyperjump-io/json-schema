import { astInstance, jsInstance } from "../kernel/instance.js";
import { readsMarks } from "../kernel/kernel.js";
import { isErrorNode } from "../keywords/checks.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { instanceEqual } from "../keywords/utilities.js";
import { evaluatorForLint } from "./evaluate.js";
import { lowerForLint } from "./lower.js";
import { schemaGroup } from "./schema-group.js";
import { findKeyword, visitSchemas } from "./utilities.js";

/**
 * @import { InstanceNode } from "../kernel/instance.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LintEvaluation } from "./evaluate.d.ts"
 */

/**
 * A `const` or `enum` and a keyword next to it, with what evaluating each
 * value against the keyword found. `marksAreRead` is whether something
 * that applies to the same instance might read what the keyword marks.
 *
 * @typedef {{
 *   valuesNode: JsonSchemaKeywordNode;
 *   isConst: boolean;
 *   keywordNode: JsonSchemaKeywordNode;
 *   results: [JsonSchemaTolerantNode, LintEvaluation][];
 *   marksAreRead: boolean;
 * }} KeywordResult
 */

const keyword = "https://json-schema.org/keyword";
const constUri = `${keyword}/const`;
const enumUris = [`${keyword}/enum`, `${keyword}/draft-04/enum`];

/**
 * Results are found once for each tree, so rules share them
 *
 * @type WeakMap<JsonSchemaDocumentNode, Promise<KeywordResult[]>>
 */
const cache = new WeakMap();

/**
 * Each value of every `const` and `enum` in the document, evaluated against
 * each keyword group next to it (`evaluatorForLint`), one at a time, so
 * what a keyword says about the values doesn't depend on the rest of the
 * schema. A group that reads marks gets what the others marked. `type` is
 * left to the rules for it, and so is a keyword with no effect (one that
 * lowers to `pass`), or with its default value, which
 * `keyword-with-default-value` reports. A schema with both `const` and
 * `enum` isn't included, because `const-and-enum` reports it.
 *
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<KeywordResult[]>
 */
export const constOrEnumKeywords = (session, tree) => {
  let results = cache.get(tree);
  if (results === undefined) {
    results = evaluate(session, tree);
    cache.set(tree, results);
  }
  return results;
};

/** @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<KeywordResult[]> */
const evaluate = async (session, tree) => {
  const { jsonSchema } = session;
  const lowered = await lowerForLint(session, tree);

  /** @type {{ schemaNode: JsonSchemaNode; valuesNode: JsonSchemaKeywordNode; isConst: boolean }[]} */
  const found = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type !== "json-schema") {
      return;
    }

    const constNode = findKeyword(schemaNode, constUri);
    const enumNodes = enumUris.map((uri) => findKeyword(schemaNode, uri)).filter((node) => node !== undefined);
    if (constNode !== undefined && enumNodes.length === 0) {
      found.push({ schemaNode, valuesNode: constNode, isConst: true });
    } else if (constNode === undefined && enumNodes.length === 1 && enumNodes[0].children[1].jsonType === "array") {
      found.push({ schemaNode, valuesNode: enumNodes[0], isConst: false });
    }
  });
  if (found.length === 0) {
    return [];
  }

  const evaluator = await evaluatorForLint(session, tree);

  /** @type KeywordResult[] */
  const results = [];
  for (const { schemaNode, valuesNode, isConst } of found) {
    // Values that couldn't be parsed aren't evaluated
    const valuesValue = valuesNode.children[1];
    /** @type JsonSchemaTolerantNode[] */
    const allValueNodes = isConst ? [valuesValue] : valuesValue.jsonType === "array" ? valuesValue.children : [];
    const valueNodes = allValueNodes.filter((valueNode) => !isErrorNode(valueNode));
    const evaluations = valueNodes.map((valueNode) => evaluator.keywords(schemaNode, valueNode));

    // Marks are read by a schema that applies to the same instance, which
    // might be one this document doesn't have
    const group = await schemaGroup(session, tree, schemaNode);
    const marksAreRead = group.unknown || group.schemas.some((node) => {
      const keywords = lowered.get(node);
      return keywords === undefined
        ? node.type === "json-schema" && node.jsonType === "object"
        : keywords.some(({ group }) => readsMarks(group.expression));
    });

    for (const [index, { group, keywordNode }] of (lowered.get(schemaNode) ?? []).entries()) {
      if (keywordNode === valuesNode || group.expression.op === "pass" || group.expression.op === "typeIs") {
        continue;
      }

      const definition = jsonSchema.getKeyword(keywordDefinitionUri(keywordNode.keywordUri));
      const value = /** @type InstanceNode */ (keywordNode.children[1]);
      if (definition.default !== undefined && instanceEqual(astInstance, value, jsInstance, definition.default, false)) {
        continue;
      }

      results.push({
        valuesNode,
        isConst,
        keywordNode,
        results: valueNodes.map((valueNode, valueIndex) => [valueNode, evaluations[valueIndex][index][1]]),
        marksAreRead
      });
    }
  }

  return results;
};

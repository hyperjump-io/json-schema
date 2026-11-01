import { jsonValue } from "@hyperjump/browser";
import { readsMarks } from "../../kernel/kernel.js";
import { operationsOf } from "../analysis.js";
import { documentForLint, lowerSchemaForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { KeywordGroup } from "../../kernel/kernel.d.ts"
 */

/** `$schema` only belongs at a resource's root */
const schemaUri = "https://json-schema.org/keyword/schema";

/**
 * The schemas a keyword applies are mergeable if its group is the same as
 * applying them all: `all` of them (`allOf`), or one schema (`anyOf` or
 * `oneOf` with one), and they're in its value, so a reference isn't. Its keywords can be moved if the schema it's in, with them in
 * it, lowers to what the two lower to separately (`lowerSchemaForLint`).
 * A keyword that's in both is combined: arrays are joined and objects
 * merged, and a value in both is kept once. So `required` and maps whose
 * entries don't depend on each other combine, and a keyword moved next to
 * one it reads, or that reads it, like `then` next to `if`, is found from
 * what it lowers to, not from a list of keywords.
 *
 * What lowering doesn't say is checked too: identifiers (a `resolve` hook)
 * and definitions (a keyword without a group that holds schemas no keyword
 * reads), whose URIs would change, `$schema`, and keywords that read what
 * their siblings evaluated, which have the same expression wherever they
 * are, but see more.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const mergeableSchemas = lintRule({ origin: "json-schema-lint:mergeable-schemas", url: "https://hyperjump.io/json-schema/linting/rules/mergeable-schemas/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  const { keywords: definitions } = document.definitions;

  /** @type Set<JsonSchemaKeywordNode> */
  const readingMarks = new Set();
  /** @type Set<JsonSchemaKeywordNode> */
  const grouped = new Set();
  for (const keywords of lowered.values()) {
    for (const { group, keywordNode, sourceNodes } of keywords) {
      grouped.add(keywordNode);
      sourceNodes.forEach((sourceNode) => grouped.add(sourceNode));
      if (readsMarks(group.expression)) {
        readingMarks.add(keywordNode);
      }
    }
  }

  /**
   * Whether two keywords read one another, as their definitions declare.
   * One that doesn't lower, which lowering can't show, can still read a
   * sibling.
   *
   * @type (a: string, b: string) => boolean
   */
  const interact = (a, b) => Object.values(definitions[a]?.siblings ?? {}).includes(b)
    || Object.values(definitions[b]?.siblings ?? {}).includes(a);

  /** @type (keywordNode: JsonSchemaKeywordNode) => boolean */
  const isUnmovable = (keywordNode) => keywordNode.keywordUri === schemaUri
    || definitions[keywordNode.keywordUri]?.resolve !== undefined
    || readingMarks.has(keywordNode)
    || (!grouped.has(keywordNode) && holdsSchemas(/** @type TreeNode */ (keywordNode.children[1])));

  for (const [schemaNode, keywords] of lowered) {
    if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
      continue;
    }

    for (const { group, keywordNode: allOfNode } of keywords) {
      // `all` and `any` of one schema are the schema, and so is `one` of it
      const { expression } = group;
      const applied = expression.op === "all" || (expression.op === "one" && expression.of.length === 1) ? expression.of : [expression];
      const valueNode = allOfNode.children[1];
      if (!applied.every(({ op }) => op === "apply") || valueNode.jsonType !== "array" || valueNode.children.length !== applied.length) {
        continue;
      }

      const name = allOfNode.children[0].value;

      // The schema's keywords, and those of the schemas moved into it so far
      /** @type JsonSchemaKeywordNode[] */
      let merged = (/** @type JsonSchemaKeywordNode[] */ (schemaNode.children)).filter((keywordNode) => keywordNode !== allOfNode);

      /** @type (keywordNodes: JsonSchemaKeywordNode[]) => KeywordGroup[] | undefined */
      const lower = (keywordNodes) => lowerSchemaForLint(document, /** @type JsonSchemaNode */ ({ ...schemaNode, children: keywordNodes }));

      for (const branch of /** @type JsonSchemaNode[] */ (valueNode.children)) {
        if (branch.type === "reference") {
          // A schema that's a reference (draft-04 through draft-07) replaces the
          // schema it's in, so it can only replace one with nothing else in
          // it. From 2019-09, `$ref` is a keyword like any other.
          if (valueNode.children.length === 1 && merged.length === 0) {
            file.message(`This schema can replace the schema '${name}' is in`, { place: branch.position });
          }
          continue;
        }

        const branchKeywords = branch.jsonType === "object" ? /** @type JsonSchemaKeywordNode[] */ (branch.children) : [];
        const branchGroups = lowered.get(branch);
        if (branch.jsonType !== "object" || branchGroups === undefined || branchKeywords.some(isUnmovable)
          || branchKeywords.some(({ keywordUri }) => merged.some((other) => interact(keywordUri, other.keywordUri)))) {
          continue;
        }

        const candidate = combine(merged, branchKeywords);
        const separately = lower(merged);
        const together = candidate === undefined ? undefined : lower(candidate);
        if (candidate === undefined || separately === undefined || together === undefined) {
          continue;
        }

        if (sameOperations([...separately, ...branchGroups.map(({ group }) => group)], together)) {
          merged = candidate;
          file.message(`This schema's keywords can be moved into the schema '${name}' is in`, { place: branch.position });
        }
      }
    }
  }
});

export default mergeableSchemas;

/**
 * A schema's keywords with another's moved in. A keyword in both is
 * combined, and it's undefined if one can't be.
 *
 * @type (keywordNodes: JsonSchemaKeywordNode[], moved: JsonSchemaKeywordNode[]) => JsonSchemaKeywordNode[] | undefined
 */
const combine = (keywordNodes, moved) => {
  const result = [...keywordNodes];
  for (const keywordNode of moved) {
    const index = result.findIndex(({ keywordUri }) => keywordUri === keywordNode.keywordUri);
    if (index === -1) {
      result.push(keywordNode);
      continue;
    }

    const existing = result[index];
    const valueNode = combineValues(/** @type JsonSchemaNode */ (existing.children[1]), /** @type JsonSchemaNode */ (keywordNode.children[1]));
    if (valueNode === undefined) {
      return;
    }
    result[index] = /** @type JsonSchemaKeywordNode */ ({ ...existing, children: [existing.children[0], valueNode] });
  }
  return result;
};

/**
 * Two values of a keyword as one: arrays joined and objects merged, with a
 * value in both kept once, or the value if they're equal. It's undefined
 * if objects have a name in common with different values, or they're
 * anything else.
 *
 * @type (a: JsonSchemaNode, b: JsonSchemaNode) => JsonSchemaNode | undefined
 */
const combineValues = (a, b) => {
  if (a.jsonType === "array" && b.jsonType === "array") {
    const values = new Set(a.children.map(valueOf));
    return /** @type JsonSchemaNode */ ({ ...a, children: [...a.children, ...b.children.filter((itemNode) => !values.has(valueOf(itemNode)))] });
  } else if (a.jsonType === "object" && b.jsonType === "object") {
    const children = [...a.children];
    for (const property of b.children) {
      const same = a.children.find((other) => other.children[0].value === property.children[0].value);
      if (same === undefined) {
        children.push(property);
      } else if (valueOf(same.children[1]) !== valueOf(property.children[1])) {
        return;
      }
    }
    return /** @type JsonSchemaNode */ ({ ...a, children });
  }

  return valueOf(a) === valueOf(b) ? a : undefined;
};

/**
 * Whether two lists of groups have the same operations, as a schema's
 * groups have to all pass, and the same operation twice is the same as once
 *
 * @type (a: KeywordGroup[], b: KeywordGroup[]) => boolean
 */
const sameOperations = (a, b) => {
  /** @type (groups: KeywordGroup[]) => Set<string> */
  const operations = (groups) => new Set(groups.flatMap(({ expression }) => operationsOf(expression)).map((operation) => JSON.stringify(operation)));
  const aOperations = operations(a);
  const bOperations = operations(b);
  return aOperations.size === bOperations.size && [...aOperations].every((operation) => bOperations.has(operation));
};

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/**
 * Whether a value has schemas in it
 *
 * @type (node: TreeNode) => boolean
 */
const holdsSchemas = (node) => node.type === "json-schema" || node.type === "reference" || (node.children ?? []).some(holdsSchemas);

/** @type (node: unknown) => string */
const valueOf = (node) => JSON.stringify(jsonValue(/** @type any */ (node)));

import { operationsOf, propertyOperations } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { isNegated, schemaGroup } from "../schema-group.js";
import { nodeFor } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/**
 * @typedef {{ schemaNode: JsonSchemaNode; keywordNode: JsonSchemaKeywordNode; name: string }} Required
 */

/**
 * A required property is `hasProperty`, and what defines one is `property`
 * or `eachProperty` (`propertyOperations`). An `unevaluated` selector
 * defines every one. So no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const requiredPropertyNotDefined = lintRule({ origin: "json-schema-lint:required-property-not-defined", url: "https://hyperjump.io/json-schema/linting/rules/required-property-not-defined/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;

  /** @type Required[] */
  const requireds = [];
  for (const [schemaNode, keywords] of lowered) {
    for (const { group, keywordNode } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op === "hasProperty") {
          requireds.push({ schemaNode, keywordNode, name: operation.name });
        }
      }
    }
  }

  // A schema in the group can be in another document, whose schemas are in
  // `reached`
  for (const { schemaNode, keywordNode, name } of requireds) {
    const group = schemaGroup(document, schemaNode);

    // A schema in `not` requires that a property isn't there
    if (group.unknown || isNegated(group, schemaNode)) {
      continue;
    }

    // A schema that's a reference (draft-04 through draft-07) ignores what's
    // next to it, so it doesn't define anything
    const defining = group.schemas
      .filter((member) => member.type === "json-schema")
      .map((member) => document.reached.get(member) ?? []);

    // A group that defines no properties, and could be applied from another
    // document, is likely meant to be combined with one that does
    if (group.open && !defining.some(definesAny)) {
      continue;
    }

    const defined = defining.some((keywords) => {
      const operations = propertyOperations(keywords, name);
      return operations === undefined || operations.length > 0 || readsUnevaluated(keywords);
    });
    if (!defined) {
      const place = (nodeFor(keywordNode, name) ?? keywordNode).position;
      file.message(`'${name}' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed`, { place });
    }
  }
});

export default requiredPropertyNotDefined;

/** @type (keywords: LoweredKeyword[]) => boolean */
const definesAny = (keywords) => keywords.some(({ group }) => operationsOf(group.expression)
  .some((operation) => operation.op === "property" || operation.op === "eachProperty"));

/** @type (keywords: LoweredKeyword[]) => boolean */
const readsUnevaluated = (keywords) => keywords.some(({ group }) => operationsOf(group.expression)
  .some((operation) => operation.op === "eachProperty" && "unevaluated" in operation.select));

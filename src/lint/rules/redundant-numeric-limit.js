import { lintRule } from "../lint-rule.js";
import { findKeyword, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/** Each inclusive limit, its exclusive limit, and the word for the tighter one */
const pairs = /** @type const */ ([
  [`${keyword}/maximum`, `${keyword}/exclusiveMaximum`, "lower"],
  [`${keyword}/minimum`, `${keyword}/exclusiveMinimum`, "higher"]
]);

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const redundantNumericLimit = lintRule({ origin: "json-schema-lint:redundant-numeric-limit", url: "https://hyperjump.io/json-schema/linting/rules/redundant-numeric-limit/" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    for (const [inclusiveUri, exclusiveUri, tighter] of pairs) {
      const inclusiveNode = findKeyword(schemaNode, inclusiveUri);
      const exclusiveNode = findKeyword(schemaNode, exclusiveUri);
      const inclusive = numberOf(inclusiveNode);
      const exclusive = numberOf(exclusiveNode);
      if (inclusiveNode === undefined || exclusiveNode === undefined || inclusive === undefined || exclusive === undefined) {
        continue;
      }

      const inclusiveName = `'${inclusiveNode.children[0].value}'`;
      const exclusiveName = `'${exclusiveNode.children[0].value}'`;
      // Whether the exclusive limit allows less than the inclusive one does
      const exclusiveIsTighter = tighter === "lower" ? exclusive <= inclusive : exclusive >= inclusive;
      if (exclusive === inclusive) {
        file.message(`${inclusiveName} has no effect, because ${exclusiveName} excludes the same value`, { place: inclusiveNode.position });
      } else if (exclusiveIsTighter) {
        file.message(`${inclusiveName} has no effect, because ${exclusiveName} is ${tighter}`, { place: inclusiveNode.position });
      } else {
        file.message(`${exclusiveName} has no effect, because ${inclusiveName} is ${tighter}`, { place: exclusiveNode.position });
      }
    }
  });
});

export default redundantNumericLimit;

/** @type (keywordNode: JsonSchemaKeywordNode | undefined) => number | undefined */
const numberOf = (keywordNode) => {
  const valueNode = keywordNode?.children[1];
  return valueNode?.jsonType === "number" ? valueNode.value : undefined;
};

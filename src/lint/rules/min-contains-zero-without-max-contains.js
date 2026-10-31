import { operationsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * It's `contains` with a `min` of 0 that came from a sibling, and no `max`,
 * so no keyword is named, except the one it suggests, `maxContains`
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const minContainsZeroWithoutMaxContains = lintRule({ origin: "json-schema-lint:min-contains-zero-without-max-contains", url: "https://hyperjump.io/json-schema/linting/rules/min-contains-zero-without-max-contains/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const keywords of document.schemas.values()) {
    for (const { group, keywordNode, cameFrom } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op !== "contains" || operation.min !== 0 || operation.max !== null) {
          continue;
        }

        // Without `contains`, min-max-contains-without-contains reports it
        const minNode = cameFrom(operation, "min").find((node) => node !== keywordNode);
        if (minNode !== undefined) {
          const containsName = keywordNode.children[0].value;
          file.message(`'${minNode.children[0].value}' is 0 and there's no 'maxContains', so '${containsName}' never fails`, { place: minNode.position });
        }
      }
    }
  }
});

export default minContainsZeroWithoutMaxContains;

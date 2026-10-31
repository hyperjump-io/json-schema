import { allowsNothing } from "../allows-nothing.js";
import { operationsOf, propertyOperations } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { nodeFor, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * A required property is `hasProperty`, and what applies to it is
 * `property` and `eachProperty` (`propertyOperations`), so no keyword is
 * named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const requiredPropertyNotAllowed = lintRule({ origin: "json-schema-lint:required-property-not-allowed", url: "https://hyperjump.io/json-schema/linting/rules/required-property-not-allowed/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visitSchemas(tree, (schemaNode) => {
    schemaNodes.set(schemaNode.location, schemaNode);
  });

  for (const keywords of lowered.values()) {
    for (const { group, keywordNode } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op !== "hasProperty") {
          continue;
        }

        const rejecting = propertyOperations(keywords, operation.name)
          ?.find(({ of }) => allowsNothing(of, schemaNodes, lowered));
        if (rejecting !== undefined) {
          const keywordName = rejecting.keyword.keywordNode.children[0].value;
          const place = (nodeFor(keywordNode, operation.name) ?? keywordNode).position;
          file.message(`'${operation.name}' is required, but '${keywordName}' doesn't allow it, so no object is valid`, { place });
        }
      }
    }
  }
});

export default requiredPropertyNotAllowed;

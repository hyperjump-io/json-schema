import { visit } from "unist-util-visit";
import { allowsNothing } from "../allows-nothing.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * A keyword allows nothing if its group does (`allowsNothing`), following
 * only the schemas in its own value, so no keyword is named
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const keywordAllowsNothing = lintRule({ origin: "json-schema-lint:keyword-allows-nothing", url: "https://hyperjump.io/json-schema/linting/rules/keyword-allows-nothing/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    schemaNodes.set(schemaNode.location, schemaNode);
  });

  const lowered = document.schemas;
  for (const keywords of lowered.values()) {
    for (const { group, keywordNode } of keywords) {
      if (!allowsNothing(group.expression, schemaNodes, lowered, group.location)) {
        continue;
      }

      const name = keywordNode.children[0].value;
      const valueNode = keywordNode.children[1];
      const reason = valueNode.jsonType === "array" && valueNode.children.length === 0 ? "is empty" : "allows nothing";
      file.message(`'${name}' ${reason}, so nothing is valid against it`, { place: keywordNode.position });
    }
  }
});

export default keywordAllowsNothing;

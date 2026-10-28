import { allowsNothing } from "../allows-nothing.js";
import { keywordApplying } from "../applied.js";
import { second } from "../bounds.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * An `if` is a `cases` with one condition that's the keyword's schema, and
 * branches that are the schemas of the siblings it reads (`then`, `else`).
 * A branch that no value passes is `allowsNothing`, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const falseThenElse = lintRule({ origin: "json-schema-lint:false-then-else", url: "https://hyperjump.io/json-schema/linting/rules/false-then-else/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visitSchemas(tree, (schemaNode) => {
    schemaNodes.set(schemaNode.location, schemaNode);
  });

  const lowered = await lowerForLint(session, tree);
  for (const keywords of lowered.values()) {
    for (const keyword of keywords) {
      const { expression } = keyword.group;
      if (expression.op !== "cases" || expression.cases.length !== 1 || keywordApplying(keyword, expression.cases[0][0]) !== keyword.keywordNode) {
        continue;
      }

      const [, then] = expression.cases[0];
      const thenNode = keywordApplying(keyword, then);
      const elseNode = keywordApplying(keyword, expression.otherwise);
      /** @type (node: JsonSchemaKeywordNode | undefined, branch: Expression | null) => boolean */
      const isFalse = (node, branch) => node !== undefined && branch !== null && allowsNothing(branch, schemaNodes, lowered);
      const ifName = `'${keyword.keywordNode.children[0].value}'`;

      if (thenNode && elseNode && isFalse(thenNode, then) && isFalse(elseNode, expression.otherwise)) {
        // On whichever comes second, the one that makes nothing valid
        file.message(`'${thenNode.children[0].value}' and '${elseNode.children[0].value}' both allow nothing, so nothing is valid`, { place: second(thenNode, elseNode).position });
      } else if (thenNode && expression.otherwise === null && isFalse(thenNode, then)) {
        file.message(`${ifName} with a '${thenNode.children[0].value}' that allows nothing is the same as 'not' with the ${ifName} schema`, { place: thenNode.position });
      } else if (elseNode && then === null && isFalse(elseNode, expression.otherwise)) {
        file.message(`${ifName} with an '${elseNode.children[0].value}' that allows nothing is the same as the ${ifName} schema on its own`, { place: elseNode.position });
      }
    }
  }
});

export default falseThenElse;

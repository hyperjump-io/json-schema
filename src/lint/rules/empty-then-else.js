import { operationsOf } from "../analysis.js";
import { keywordApplying } from "../applied.js";
import { effectOf } from "../effect.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * A branch is a schema a `cases` applies when a condition passes or none
 * does (`then` and `else` for `if`, v1's `conditional`, `dependentSchemas`),
 * and it's empty if it does nothing (`effectOf`), so no keyword is named.
 * A branch that's a keyword's value is named by the keyword.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const emptyThenElse = lintRule({ origin: "json-schema-lint:empty-then-else", url: "https://hyperjump.io/json-schema/linting/rules/empty-then-else/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visitSchemas(tree, (schemaNode) => {
    schemaNodes.set(schemaNode.location, schemaNode);
  });

  for (const keywords of (await lowerForLint(session, tree)).values()) {
    for (const keyword of keywords) {
      const branches = operationsOf(keyword.group.expression)
        .flatMap((operation) => operation.op === "cases" ? [...operation.cases.map(([, then]) => then), operation.otherwise] : []);
      for (const branch of branches) {
        if (branch?.op !== "apply" || !schemaNodes.has(branch.schema) || await effectOf(session, tree, keyword, branch.schema) !== "none") {
          continue;
        }

        const branchKeyword = keywordApplying(keyword, branch);
        if (branchKeyword !== undefined) {
          file.message(`'${branchKeyword.children[0].value}' has no effect, because every value is valid against it`, { place: branchKeyword.position });
        } else {
          file.message(`This schema has no effect, because every value is valid against it`, { place: schemaNodes.get(branch.schema)?.position });
        }
      }
    }
  }
});

export default emptyThenElse;

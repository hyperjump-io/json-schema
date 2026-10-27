import { marksEvery, marksRead } from "../evaluated.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * What a keyword reads and what the others mark is what they lower to, so
 * no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const unevaluatedWithoutEffect = lintRule({ origin: "json-schema-lint:unevaluated-without-effect", url: "https://hyperjump.io/json-schema/linting/rules/unevaluated-without-effect/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  for (const [schemaNode, keywords] of lowered) {
    for (const keyword of keywords) {
      for (const children of marksRead(keyword.group.expression)) {
        if (await marksEvery(session, tree, schemaNode, keyword, children)) {
          const name = keyword.keywordNode.children[0].value;
          const child = children === "properties" ? "property" : "item";
          file.message(`'${name}' has no effect, because other keywords evaluate every ${child}`, { place: keyword.keywordNode.position });
        }
      }
    }
  }
});

export default unevaluatedWithoutEffect;

import { operationsOf, typeIsOf } from "../analysis.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * `multipleOf: 1` is a keyword that lowers to `multipleOf` with a divisor
 * of 1 and nothing else, and `type` is a keyword that lowers to `typeIs`,
 * so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const multipleOfOne = lintRule({ origin: "json-schema-lint:multiple-of-one", url: "https://hyperjump.io/json-schema/linting/rules/multiple-of-one/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const keywords of (await lowerForLint(session, tree)).values()) {
    // Without `type`, other types are valid, so it can't be replaced
    const type = typeIsOf(keywords);
    if (type === undefined) {
      continue;
    }

    const typeName = type.keywordNode.children[0].value;
    for (const { group, keywordNode } of keywords) {
      const operations = operationsOf(group.expression);
      if (operations.length !== 1 || operations[0].op !== "multipleOf" || operations[0].divisor !== 1) {
        continue;
      }

      const name = keywordNode.children[0].value;
      if (type.types.has("number") && type.types.has("integer")) {
        file.message(`'${name}': 1 only allows integers. Remove it, and 'number' from '${typeName}', which also allows 'integer'.`, { place: keywordNode.position });
      } else if (type.types.has("number")) {
        file.message(`'${name}': 1 only allows integers. Remove it, and replace 'number' with 'integer' in '${typeName}'.`, { place: keywordNode.position });
      } else if (type.types.has("integer")) {
        file.message(`'${name}': 1 has no effect, because '${typeName}' only allows integers`, { place: keywordNode.position });
      }
    }
  }
});

export default multipleOfOne;

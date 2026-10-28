import { typeIsOf } from "../analysis.js";
import { boundsOf, namesOf } from "../bounds.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * Limits are what `range` says (`boundsOf`), and `type` is a keyword that
 * lowers to `typeIs`, so no keyword is named. A limit rounds to the integer
 * it's the same as, toward what it allows, and an exclusive one is then the
 * same as an inclusive one, including draft-04's.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const fractionalLimitForInteger = lintRule({ origin: "json-schema-lint:fractional-limit-for-integer", url: "https://hyperjump.io/json-schema/linting/rules/fractional-limit-for-integer/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const keywords of (await lowerForLint(session, tree)).values()) {
    // Only numbers that are integers are valid
    const type = typeIsOf(keywords);
    if (!type?.types.has("integer") || type.types.has("number")) {
      continue;
    }

    const typeName = type.keywordNode.children[0].value;
    const { number } = boundsOf(keywords);
    for (const [bounds, round] of /** @type const */ ([[number.max, Math.floor], [number.min, Math.ceil]])) {
      for (const bound of bounds) {
        if (Number.isInteger(bound.value)) {
          continue;
        }

        // An exclusive limit that isn't an integer allows the integer it rounds to
        const integer = round(bound.value);
        const sameAs = bound.exclusive ? `${integer} inclusive` : `${integer}`;
        file.message(`${namesOf(bound.limitNodes)} isn't an integer, but '${typeName}' only allows integers, so it's the same as ${sameAs}`, { place: bound.keywordNode.position });
      }
    }
  }
});

export default fractionalLimitForInteger;

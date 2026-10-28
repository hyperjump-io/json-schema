import { boundsOf, tightestMax, tightestMin } from "../bounds.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * Limits are what `range` says (`boundsOf`), from whichever keywords
 * lowered to it, so no keyword is named. A limit that isn't the tightest
 * on its side has no effect, if it's all its keyword lowers to.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const redundantNumericLimit = lintRule({ origin: "json-schema-lint:redundant-numeric-limit", url: "https://hyperjump.io/json-schema/linting/rules/redundant-numeric-limit/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const keywords of (await lowerForLint(session, tree)).values()) {
    const { number } = boundsOf(keywords);
    for (const [bounds, tightest, tighter] of /** @type const */ ([[number.max, tightestMax, "lower"], [number.min, tightestMin, "higher"]])) {
      const limit = tightest(bounds);
      for (const bound of bounds) {
        if (limit === undefined || bound === limit || !bound.alone || bound.limitNodes.some((node) => limit.limitNodes.includes(node))) {
          continue;
        }

        let reason;
        if (bound.value !== limit.value) {
          reason = `${limit.label} is ${tighter}`;
        } else if (limit.exclusive && !bound.exclusive) {
          reason = `${limit.label} excludes the same value`;
        } else {
          reason = `${limit.label} is the same`;
        }
        file.message(`${bound.label} has no effect, because ${reason}`, { place: bound.keywordNode.position });
      }
    }
  }
});

export default redundantNumericLimit;

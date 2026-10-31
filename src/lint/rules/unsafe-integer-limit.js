import { typeIsOf } from "../analysis.js";
import { boundsOf, namesOf } from "../bounds.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * Limits are what `range` says (`boundsOf`), and `type` is a keyword that
 * lowers to `typeIs`, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const unsafeIntegerLimit = lintRule({ origin: "json-schema-lint:unsafe-integer-limit", url: "https://hyperjump.io/json-schema/linting/rules/unsafe-integer-limit/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const keywords of document.schemas.values()) {
    // Only numbers that are integers are valid
    const type = typeIsOf(keywords);
    if (!type?.types.has("integer") || type.types.has("number")) {
      continue;
    }

    const { number } = boundsOf(keywords);
    for (const bound of [...number.max, ...number.min]) {
      if (Math.abs(bound.value) > Number.MAX_SAFE_INTEGER) {
        file.message(`${namesOf(bound.limitNodes)} is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly`, { place: bound.keywordNode.position });
      }
    }
  }
});

export default unsafeIntegerLimit;

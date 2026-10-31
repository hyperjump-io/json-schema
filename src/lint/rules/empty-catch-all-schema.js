import { affectsAReader, effectOf } from "../effect.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * What a keyword does is what it lowers to, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const emptyCatchAllSchema = lintRule({ origin: "json-schema-lint:empty-catch-all-schema", url: "https://hyperjump.io/json-schema/linting/rules/empty-catch-all-schema/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  for (const keywords of lowered.values()) {
    for (const keyword of keywords) {
      const { keywordNode } = keyword;
      if (effectOf(document, keyword) === "marksAll" && !affectsAReader(keywords, keywordNode)) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has a schema that allows everything, which is the same as leaving it out`, { place: keywordNode.position });
      }
    }
  }
});

export default emptyCatchAllSchema;

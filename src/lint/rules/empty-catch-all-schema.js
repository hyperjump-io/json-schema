import { affectsAReader, effectOf } from "../effect.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * What a keyword does is what it lowers to, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const emptyCatchAllSchema = lintRule({ origin: "jsonschema-lint:empty-catch-all-schema" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  for (const keywords of lowered.values()) {
    for (const keyword of keywords) {
      const { keywordNode } = keyword;
      if (await effectOf(session, tree, keyword) === "marksAll" && !affectsAReader(keywords, keywordNode)) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has a schema that allows everything, which is the same as leaving it out`, { place: keywordNode.position });
      }
    }
  }
});

export default emptyCatchAllSchema;

import { keywordDefinitionUri } from "../../keywords/unknown.js";
import { affectsAReader, effectOf } from "../effect.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { marksAreRead, schemaGroup } from "../schema-group.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const unknownUri = "https://json-schema.org/keyword/unknown";

/**
 * What a keyword does is what it lowers to, and what the keywords that read
 * it lower to with it, so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const keywordWithoutEffect = lintRule({ origin: "jsonschema-lint:keyword-without-effect", url: "https://hyperjump.io/json-schema/linting/rules/keyword-without-effect/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  for (const [schemaNode, keywords] of lowered) {
    /** @type boolean | undefined */
    let marksMightBeRead;

    const keywordNodes = /** @type JsonSchemaKeywordNode[] */ (schemaNode.jsonType === "object" ? schemaNode.children : []);
    for (const keywordNode of keywordNodes) {
      const definitionUri = keywordDefinitionUri(keywordNode.keywordUri);
      if (definitionUri === unknownUri || affectsAReader(keywords, keywordNode)) {
        continue;
      }

      const keyword = keywords.find((keyword) => keyword.keywordNode === keywordNode);
      let withoutEffect;
      if (keyword === undefined) {
        // A sibling that every keyword that reads it lowers the same without
        withoutEffect = keywords.some(({ sourceNodes }) => sourceNodes.includes(keywordNode));
      } else if (session.jsonSchema.getKeyword(definitionUri).siblings !== undefined) {
        // A keyword without effect because of its siblings is left to rules
        // about them, like `if-without-then-else`
        withoutEffect = false;
      } else {
        const effect = await effectOf(session, tree, keyword);
        if (effect === "marks" && marksMightBeRead === undefined) {
          const group = await schemaGroup(session, tree, schemaNode);
          marksMightBeRead = group.open || await marksAreRead(session, tree, group);
        }
        withoutEffect = effect === "none" || (effect === "marks" && !marksMightBeRead);
      }

      if (withoutEffect) {
        file.message(`'${keywordNode.children[0].value}' has no effect`, { place: keywordNode.position });
      }
    }
  }
});

export default keywordWithoutEffect;

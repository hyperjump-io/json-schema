import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const vocabularyUri = "https://json-schema.org/keyword/vocabulary";

/**
 * The resolver only defines a dialect at the document's root, because a
 * dialect's meta-schema is found by its URI, and that only finds a
 * document. Anywhere else, it's ignored.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const misplacedVocabulary = lintRule({ origin: "json-schema-lint:misplaced-vocabulary", url: "https://hyperjump.io/json-schema/linting/rules/misplaced-vocabulary/" }, (tree, file) => {
  visitKeywords(tree, vocabularyUri, (keywordNode, schemaNode) => {
    if (schemaNode !== tree.children[0]) {
      file.message(`'${keywordNode.children[0].value}' is only allowed at the root of the document. It's ignored.`, { place: keywordNode.position });
    }
  });
});

export default misplacedVocabulary;

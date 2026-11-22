import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const vocabularyUri = "https://json-schema.org/keyword/vocabulary";

/**
 * The resolver defines a dialect with `$vocabulary` at the root of every
 * schema resource, which has an empty fragment, so a meta-schema embedded
 * in a bundle works. Anywhere else, it's ignored.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const misplacedVocabulary = lintRule({ origin: "json-schema-lint:misplaced-vocabulary", url: "https://hyperjump.io/json-schema/linting/rules/misplaced-vocabulary/" }, (tree, file) => {
  visitKeywords(tree, vocabularyUri, (keywordNode, schemaNode) => {
    if (schemaNode === tree.children[0]) {
      return;
    }

    const consequence = schemaNode.location.endsWith("#") ? "Other implementations might ignore it." : "It's ignored.";
    file.message(`'${keywordNode.children[0].value}' is only allowed at the root of the document. ${consequence}`, { place: keywordNode.position });
  });
});

export default misplacedVocabulary;

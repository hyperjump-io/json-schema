import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 */

const commentUri = "https://json-schema.org/keyword/comment";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const emptyThenElse = lintRule({ origin: "json-schema-lint:empty-then-else", url: "https://hyperjump.io/json-schema/linting/rules/empty-then-else/" }, (tree, file) => {
  for (const keywordUri of ["https://json-schema.org/keyword/then", "https://json-schema.org/keyword/else"]) {
    visitKeywords(tree, keywordUri, (keywordNode) => {
      if (isEmpty(keywordNode.children[1])) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has no effect, because every value is valid against it`, { place: keywordNode.position });
      }
    });
  }
});

export default emptyThenElse;

/**
 * A schema that every value passes and that has no annotations: `true`, or an
 * object with nothing but `$comment`
 *
 * @type (schemaNode: JsonSchemaTolerantNode) => boolean
 */
const isEmpty = (schemaNode) => {
  if (schemaNode.jsonType === "boolean") {
    return schemaNode.value;
  } else if (schemaNode.jsonType === "object") {
    return (/** @type JsonSchemaKeywordNode[] */ (schemaNode.children)).every((property) => property.keywordUri === commentUri);
  } else {
    return false;
  }
};

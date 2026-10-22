import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 */

const ifUri = "https://json-schema.org/keyword/if";
const commentUri = "https://json-schema.org/keyword/comment";

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

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const emptyThenElse = lintRule({ origin: "jsonschema-lint:empty-then-else" }, (tree, file) => {
  for (const keywordUri of ["https://json-schema.org/keyword/then", "https://json-schema.org/keyword/else"]) {
    visitKeywords(tree, keywordUri, (keywordNode, schemaNode) => {
      // Without `if`, then-else-without-if reports it
      if (siblingKeyword(schemaNode, ifUri) !== undefined && isEmpty(keywordNode.children[1])) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has no effect, because every value is valid against it`, { place: keywordNode.position });
      }
    });
  }
});

export default emptyThenElse;

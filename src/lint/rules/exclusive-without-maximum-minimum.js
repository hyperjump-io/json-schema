import { lintRule } from "unified-lint-rule";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** Each draft-04 `exclusive*` keyword and the keyword it makes exclusive */
const limits = [
  ["https://json-schema.org/keyword/draft-04/exclusiveMaximum", "https://json-schema.org/keyword/draft-04/maximum", "maximum"],
  ["https://json-schema.org/keyword/draft-04/exclusiveMinimum", "https://json-schema.org/keyword/draft-04/minimum", "minimum"]
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const exclusiveWithoutMaximumMinimum = lintRule({ origin: "jsonschema-lint:exclusive-without-maximum-minimum" }, (tree, file) => {
  for (const [keywordUri, limitUri, limitName] of limits) {
    visitKeywords(tree, keywordUri, (keywordNode, schemaNode) => {
      if (siblingKeyword(schemaNode, limitUri) === undefined) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' has no effect without '${limitName}'`, { place: keywordNode.position });
      }
    });
  }
});

export default exclusiveWithoutMaximumMinimum;

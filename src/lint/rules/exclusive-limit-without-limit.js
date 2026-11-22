import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** Draft-04's exclusive limits, and the limit each makes exclusive */
const limits = [
  ["https://json-schema.org/keyword/draft-04/exclusiveMaximum", "https://json-schema.org/keyword/draft-04/maximum", "maximum"],
  ["https://json-schema.org/keyword/draft-04/exclusiveMinimum", "https://json-schema.org/keyword/draft-04/minimum", "minimum"]
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const exclusiveLimitWithoutLimit = lintRule({ origin: "json-schema-lint:exclusive-limit-without-limit", url: "https://hyperjump.io/json-schema/linting/rules/exclusive-limit-without-limit/" }, (tree, file) => {
  for (const [exclusiveUri, limitUri, limitName] of limits) {
    visitKeywords(tree, exclusiveUri, (keywordNode, schemaNode) => {
      if (siblingKeyword(schemaNode, limitUri) === undefined) {
        file.message(`'${keywordNode.children[0].value}' has no effect without '${limitName}'`, { place: keywordNode.position });
      }
    });
  }
});

export default exclusiveLimitWithoutLimit;

import { lintRule } from "../lint-rule.js";
import { siblingKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** OpenAPI 3.0's exclusive limits, and the limit each makes exclusive */
const limits = [
  ["https://spec.openapis.org/oas/3.0/keyword/exclusiveMaximum", "https://spec.openapis.org/oas/3.0/keyword/maximum", "maximum"],
  ["https://spec.openapis.org/oas/3.0/keyword/exclusiveMinimum", "https://spec.openapis.org/oas/3.0/keyword/minimum", "minimum"]
];

/**
 * Draft-04's exclusive limits require their limit, so a draft-04 schema
 * without one is invalid, and isn't reported here.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
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

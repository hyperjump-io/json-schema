import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const xmlUri = "https://spec.openapis.org/oas/3.2/keyword/xml";

/**
 * What replaces each deprecated field when it's `true`. When it's `false`,
 * the default, nothing does.
 *
 * @type Record<string, string>
 */
const replacements = {
  attribute: "attribute",
  wrapped: "element"
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const deprecatedXmlField = lintRule({ origin: "json-schema-lint:deprecated-xml-field", url: "https://hyperjump.io/json-schema/linting/rules/deprecated-xml-field/" }, (tree, file) => {
  visitKeywords(tree, xmlUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "object") {
      // The keyword's check reports it
      return;
    }

    for (const propertyNode of valueNode.children) {
      const [nameNode, fieldValueNode] = propertyNode.children;
      const name = nameNode.value;
      if (!(name in replacements) || fieldValueNode.jsonType !== "boolean") {
        continue;
      }

      const advice = fieldValueNode.value
        ? `Use '"nodeType": "${replacements[name]}"' instead.`
        : `Remove it. 'false' is the default.`;
      file.message(`'${name}' is deprecated. ${advice}`, { place: propertyNode.position });
    }
  });
});

export default deprecatedXmlField;

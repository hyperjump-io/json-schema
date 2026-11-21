import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { findKeyword, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const exampleUri = "https://spec.openapis.org/oas/3.2/keyword/example";
const examplesUri = "https://json-schema.org/keyword/examples";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const deprecatedExample = lintRule({ origin: "json-schema-lint:deprecated-example", url: "https://hyperjump.io/json-schema/linting/rules/deprecated-example/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  /** @type [JsonSchemaKeywordNode, JsonSchemaNode, string][] */
  const found = [];
  visitKeywords(tree, exampleUri, (keywordNode, schemaNode) => {
    if (schemaNode.type === "json-schema") {
      found.push([keywordNode, schemaNode, schemaNode.dialectUri]);
    }
  });

  for (const [keywordNode, schemaNode, dialectUri] of found) {
    const dialect = document.dialects.get(dialectUri);
    if (dialect === undefined) {
      continue;
    }

    // OpenAPI 3.0 doesn't have `examples`, and its `example` isn't deprecated
    const { keywords } = dialect;
    const examplesName = Object.keys(keywords).find((name) => keywords[name] === examplesUri);
    if (examplesName === undefined) {
      continue;
    }

    const name = keywordNode.children[0].value;
    const advice = findKeyword(schemaNode, examplesUri) === undefined
      ? `Use '${examplesName}', which is an array of examples, instead.`
      : `Add its value to '${examplesName}' instead.`;
    file.message(`'${name}' is deprecated. ${advice}`, { place: keywordNode.position });
  }
});

export default deprecatedExample;

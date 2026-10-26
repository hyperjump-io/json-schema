import { lintRule } from "../lint-rule.js";
import { findKeyword, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const limitUris = [
  "maximum", "minimum", "exclusiveMaximum", "exclusiveMinimum", "draft-04/maximum", "draft-04/minimum"
].map((name) => `https://json-schema.org/keyword/${name}`);

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const unsafeIntegerLimit = lintRule({ origin: "json-schema-lint:unsafe-integer-limit", url: "https://hyperjump.io/json-schema/linting/rules/unsafe-integer-limit/" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    // Only numbers that are integers are valid
    const type = typeNames(schemaNode);
    if (!type?.names.has("integer") || type.names.has("number")) {
      return;
    }

    for (const uri of limitUris) {
      const keywordNode = findKeyword(schemaNode, uri);
      const valueNode = keywordNode?.children[1];
      if (keywordNode !== undefined && valueNode?.jsonType === "number" && Math.abs(valueNode.value) > Number.MAX_SAFE_INTEGER) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly`, { place: keywordNode.position });
      }
    }
  });
});

export default unsafeIntegerLimit;

import { typeIsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { findKeyword } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const xmlUris = ["3.1", "3.2"].map((version) => `https://spec.openapis.org/oas/${version}/keyword/xml`);

/**
 * `type` is a keyword that lowers to `typeIs` in the same schema, as
 * OpenAPI 3.2 says ("alongside `type` being `"array"`"), so it covers 3.0's
 * `type` too.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const wrappedWithoutArray = lintRule({ origin: "json-schema-lint:wrapped-without-array", url: "https://hyperjump.io/json-schema/linting/rules/wrapped-without-array/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const [schemaNode, keywords] of document.schemas) {
    if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
      continue;
    }

    const type = typeIsOf(keywords);
    if (type?.types.has("array")) {
      continue;
    }

    for (const xmlUri of xmlUris) {
      const valueNode = findKeyword(schemaNode, xmlUri)?.children[1];
      if (valueNode?.jsonType !== "object") {
        continue;
      }

      for (const propertyNode of valueNode.children) {
        const [nameNode, fieldValueNode] = propertyNode.children;
        if (nameNode.value === "wrapped" && fieldValueNode.jsonType === "boolean" && fieldValueNode.value) {
          file.message(`'wrapped' has no effect, because it only applies to a schema whose type is 'array'`, { place: propertyNode.position });
        }
      }
    }
  }
});

export default wrappedWithoutArray;

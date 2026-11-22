import { visit } from "unist-util-visit";
import { duplicateItems } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/** Keywords whose value is an array the specs say must be unique */
const arrays = new Set([
  "https://json-schema.org/keyword/required",
  "https://json-schema.org/keyword/draft-04/required",
  "https://json-schema.org/keyword/requireAllExcept",
  "https://json-schema.org/keyword/type",
  "https://json-schema.org/keyword/draft-2020-12/type",
  // Later drafts say `enum`'s values should be unique, which is
  // `duplicate-enum-values`
  "https://json-schema.org/keyword/draft-04/enum"
]);

/** Keywords whose value is an object of arrays that must be unique */
const mapsOfArrays = new Set([
  "https://json-schema.org/keyword/dependentRequired",
  "https://json-schema.org/keyword/draft-04/dependencies",
  "https://json-schema.org/keyword/draft-07/dependencies"
]);

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const duplicateArrayItems = lintRule({ origin: "json-schema-lint:duplicate-array-items", url: "https://hyperjump.io/json-schema/linting/rules/duplicate-array-items/" }, (tree, file) => {
  /** @type (arrayNode: JsonSchemaNode, where: string) => void */
  const report = (arrayNode, where) => {
    if (arrayNode.jsonType !== "array") {
      return;
    }

    for (const itemNode of duplicateItems(arrayNode)) {
      const what = itemNode.jsonType === "string" ? `'${itemNode.value}'` : "This value";
      file.message(`${what} is already in ${where}`, { place: itemNode.position });
    }
  };

  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (/** @type unknown */ (node));
    if (schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const [nameNode, valueNode] = keywordNode.children;
      if (arrays.has(/** @type string */ (keywordNode.keywordUri))) {
        report(valueNode, `'${nameNode.value}'`);
      } else if (mapsOfArrays.has(/** @type string */ (keywordNode.keywordUri)) && valueNode.jsonType === "object") {
        for (const property of valueNode.children) {
          report(property.children[1], `'${nameNode.value}' for '${property.children[0].value}'`);
        }
      }
    }
  });
});

export default duplicateArrayItems;

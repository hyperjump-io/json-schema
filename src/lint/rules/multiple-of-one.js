import { lintRule } from "../lint-rule.js";
import { typeNames, visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const multipleOfOne = lintRule({ origin: "jsonschema-lint:multiple-of-one" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/multipleOf", (keywordNode, schemaNode) => {
    const valueNode = keywordNode.children[1];
    // Without `type`, other types are valid, so it can't be replaced
    const type = typeNames(schemaNode);
    if (valueNode.jsonType !== "number" || valueNode.value !== 1 || type === undefined) {
      return;
    }

    const name = keywordNode.children[0].value;
    const typeName = type.keywordNode.children[0].value;
    if (type.names.has("number") && type.names.has("integer")) {
      file.message(`'${name}': 1 only allows integers. Remove it, and 'number' from '${typeName}', which also allows 'integer'.`, { place: keywordNode.position });
    } else if (type.names.has("number")) {
      file.message(`'${name}': 1 only allows integers. Remove it, and replace 'number' with 'integer' in '${typeName}'.`, { place: keywordNode.position });
    } else if (type.names.has("integer")) {
      file.message(`'${name}': 1 has no effect, because '${typeName}' only allows integers`, { place: keywordNode.position });
    }
  });
});

export default multipleOfOne;

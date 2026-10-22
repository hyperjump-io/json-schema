import { astInstance } from "../../evaluate/instance.js";
import { instanceEqual } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { InstanceNode } from "../../evaluate/instance.js"
 */

const enumUri = "https://json-schema.org/keyword/enum";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const duplicateEnumValues = lintRule({ origin: "jsonschema-lint:duplicate-enum-values" }, (tree, file) => {
  visitKeywords(tree, enumUri, (keywordNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "array") {
      return;
    }

    const name = keywordNode.children[0].value;

    // Primitives are compared with a lookup. Only arrays and objects need
    // instanceEqual.
    const primitives = new Set();
    /** @type InstanceNode[] */
    const structured = [];
    for (const itemNode of valueNode.children) {
      const item = /** @type InstanceNode */ (itemNode);
      const type = astInstance.typeOf(item);
      let isDuplicate;
      if (type === undefined) {
        // A value that couldn't be parsed was already reported
        continue;
      } else if (type === "array" || type === "object") {
        isDuplicate = structured.some((seen) => instanceEqual(astInstance, item, astInstance, seen, false));
        structured.push(item);
      } else {
        const value = astInstance.value(item);
        isDuplicate = primitives.has(value);
        primitives.add(value);
      }

      if (isDuplicate) {
        file.message(`This value is already in '${name}'`, { place: itemNode.position });
      }
    }
  });
});

export default duplicateEnumValues;

import { lintRule } from "../lint-rule.js";
import { findKeyword, typeAllows, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const constUri = "https://json-schema.org/keyword/const";
const enumUris = ["https://json-schema.org/keyword/enum", "https://json-schema.org/keyword/draft-04/enum"];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const typeImpliedByConstOrEnum = lintRule({ origin: "jsonschema-lint:type-implied-by-const-or-enum", url: "https://hyperjump.io/json-schema/linting/rules/type-implied-by-const-or-enum/" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    const type = typeNames(schemaNode);
    if (type === undefined) {
      return;
    }

    const typeName = type.keywordNode.children[0].value;
    const constNode = findKeyword(schemaNode, constUri);
    if (constNode !== undefined) {
      // A value that couldn't be parsed has an unknown type
      if (typeAllows(type.names, constNode.children[1])) {
        const constName = constNode.children[0].value;
        file.message(`'${typeName}' has no effect, because it allows the '${constName}' value`, { place: type.keywordNode.position });
      }
      return;
    }

    for (const enumUri of enumUris) {
      const enumNode = findKeyword(schemaNode, enumUri);
      const enumValue = enumNode?.children[1];
      if (enumNode === undefined || enumValue?.jsonType !== "array" || enumValue.children.length === 0) {
        continue;
      }

      // Values `type` doesn't allow are reported by
      // const-or-enum-value-for-disallowed-type. Then `type` has an effect.
      if (enumValue.children.every((itemNode) => typeAllows(type.names, itemNode))) {
        const enumName = enumNode.children[0].value;
        file.message(`'${typeName}' has no effect, because it allows every value in '${enumName}'`, { place: type.keywordNode.position });
      }
    }
  });
});

export default typeImpliedByConstOrEnum;

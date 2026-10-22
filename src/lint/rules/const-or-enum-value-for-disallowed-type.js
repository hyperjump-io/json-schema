import { lintRule } from "../lint-rule.js";
import { findKeyword, typeAllows, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 */

const constUri = "https://json-schema.org/keyword/const";
const enumUris = ["https://json-schema.org/keyword/enum", "https://json-schema.org/keyword/draft-04/enum"];

/** @type Record<string, string> */
const typeDescriptions = {
  null: "null",
  boolean: "a boolean",
  number: "a number",
  string: "a string",
  array: "an array",
  object: "an object"
};

/**
 * What a value's type is. It says a number isn't an integer if `type`
 * allows integers, since that's why it isn't allowed.
 *
 * @type (names: Set<string>, valueNode: JsonSchemaTolerantNode) => string
 */
const describe = (names, valueNode) => {
  const jsonType = /** @type string */ (/** @type any */ (valueNode).jsonType);
  return jsonType === "number" && names.has("integer") ? "a number that isn't an integer" : typeDescriptions[jsonType];
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const constOrEnumValueForDisallowedType = lintRule({ origin: "jsonschema-lint:const-or-enum-value-for-disallowed-type" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    const type = typeNames(schemaNode);
    if (type === undefined) {
      return;
    }

    const typeName = type.keywordNode.children[0].value;

    const constNode = findKeyword(schemaNode, constUri);
    // A value that couldn't be parsed has an unknown type
    if (constNode !== undefined && typeAllows(type.names, constNode.children[1]) === false) {
      const constName = constNode.children[0].value;
      const description = describe(type.names, constNode.children[1]);
      file.message(`The '${constName}' value is ${description}, which '${typeName}' doesn't allow, so nothing is valid`, { place: constNode.position });
    }

    for (const enumUri of enumUris) {
      const enumValue = findKeyword(schemaNode, enumUri)?.children[1];
      if (enumValue?.jsonType !== "array") {
        continue;
      }

      for (const itemNode of enumValue.children) {
        if (typeAllows(type.names, itemNode) === false) {
          const description = describe(type.names, itemNode);
          file.message(`This value is ${description}, which '${typeName}' doesn't allow, so it's never valid`, { place: itemNode.position });
        }
      }
    }
  });
});

export default constOrEnumValueForDisallowedType;

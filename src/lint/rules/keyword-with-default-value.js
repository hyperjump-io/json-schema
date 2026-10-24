import { astInstance, jsInstance } from "../../kernel/instance.js";
import { instanceEqual } from "../../keywords/utilities.js";
import { lintRule } from "../lint-rule.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { InstanceNode } from "../../kernel/instance.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordWithDefaultValue = lintRule({ origin: "jsonschema-lint:keyword-with-default-value" }, (tree, file) => {
  const jsonSchema = file.data.jsonSchemaSession?.jsonSchema;
  if (jsonSchema === undefined) {
    return;
  }

  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (!jsonSchema.hasKeyword(keywordNode.keywordUri)) {
        continue;
      }

      const defaultValue = jsonSchema.getKeyword(keywordNode.keywordUri).default;
      if (defaultValue === undefined) {
        continue;
      }

      const valueNode = /** @type InstanceNode */ (keywordNode.children[1]);
      /** @type (value: Json) => boolean */
      const isEqual = (value) => instanceEqual(astInstance, valueNode, jsInstance, value, false);
      // `{}` is the same schema as `true`
      const value = isEqual(defaultValue) ? JSON.stringify(defaultValue) : defaultValue === true && isEqual({}) ? "{}" : undefined;
      if (value !== undefined) {
        const name = keywordNode.children[0].value;
        file.message(`'${name}' is ${value}, which is the same as leaving it out`, { place: keywordNode.position });
      }
    }
  });
});

export default keywordWithDefaultValue;

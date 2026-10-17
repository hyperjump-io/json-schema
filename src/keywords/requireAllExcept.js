import { jsonValue } from "@hyperjump/browser/json";

/**
 * @import { JsonSchemaKeywordNode } from "../schema-ast.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 */

const propertiesUri = "https://json-schema.org/keyword/properties";

/**
 * `requireAllExcept`. Every property in the sibling `properties` is required
 * except the ones it lists. It compiles to the names that are required.
 *
 * @type Keyword<string[]>
 */
export default {
  uri: "https://json-schema.org/keyword/requireAllExcept",
  shape: "data",
  compile(valueNode, { schemaNode }) {
    const except = new Set(/** @type string[] */ (jsonValue(valueNode)));

    /** @type string[] */
    const required = [];
    if (schemaNode.jsonType !== "object") {
      return required;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const propertiesNode = property.children[1];
      if (property.keywordUri !== propertiesUri || propertiesNode.jsonType !== "object") {
        continue;
      }

      for (const propertyNode of propertiesNode.children) {
        const name = propertyNode.children[0].value;
        if (!except.has(name)) {
          required.push(name);
        }
      }
    }

    return required;
  },
  evaluate: (required, { instance }) => (node) => {
    if (instance.typeOf(node) !== "object") {
      return true;
    }

    for (const name of required) {
      if (!instance.has(node, name)) {
        return false;
      }
    }

    return true;
  }
};

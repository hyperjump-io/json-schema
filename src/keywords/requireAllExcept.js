import { jsonValue } from "@hyperjump/browser/json";
import { siblingKeyword } from "./utilities.js";
import { uniqueStrings } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `requireAllExcept`. Every property in the sibling `properties` is required
 * except the ones it lists. It compiles to the names that are required.
 *
 * @type Keyword<string[]>
 */
export default {
  uri: "https://json-schema.org/keyword/requireAllExcept",
  shape: "data",
  check: uniqueStrings,
  compile(valueNode, { schemaNode }) {
    const except = new Set(/** @type string[] */ (jsonValue(valueNode)));

    /** @type string[] */
    const required = [];
    const propertiesNode = siblingKeyword(schemaNode, "https://json-schema.org/keyword/properties");
    if (propertiesNode?.jsonType === "object") {
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

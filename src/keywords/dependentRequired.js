/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `dependentRequired`
 *
 * @type Keyword<Record<string, string[]>>
 */
export default {
  uri: "https://json-schema.org/keyword/dependentRequired",
  shape: "data",
  valueSchema: new URL("./dependentRequired.schema.json", import.meta.url).href,
  evaluate(dependentRequired, { instance }) {
    const dependencies = Object.entries(dependentRequired);

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      for (const [name, required] of dependencies) {
        if (!instance.has(node, name)) {
          continue;
        }

        for (const requiredName of required) {
          if (!instance.has(node, requiredName)) {
            return false;
          }
        }
      }

      return true;
    };
  }
};

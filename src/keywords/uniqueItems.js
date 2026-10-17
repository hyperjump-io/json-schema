import { instanceEqual } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `uniqueItems`. Items are compared like `const` compares, so objects are
 * equal regardless of property order.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/uniqueItems",
  shape: "data",
  valueSchema: new URL("./uniqueItems.schema.json", import.meta.url).href,
  evaluate(uniqueItems, { instance }) {
    if (!uniqueItems) {
      return () => true;
    }

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      // An item that couldn't be parsed, or that has parts that couldn't be,
      // isn't a duplicate of anything
      const items = [...instance.items(node)];
      for (let i = 1; i < items.length; i++) {
        for (let j = 0; j < i; j++) {
          if (instanceEqual(instance, items[j], instance, items[i], false)) {
            return false;
          }
        }
      }

      return true;
    };
  }
};

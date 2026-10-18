import { instanceEqual } from "./utilities.js";
import keywordSchema from "./uniqueItems.schema.json" with { type: "json" };

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
  schema: keywordSchema,
  evaluate(uniqueItems, { instance }) {
    if (!uniqueItems) {
      return;
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

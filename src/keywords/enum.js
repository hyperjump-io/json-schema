import { jsInstance } from "../evaluate/instance.js";
import { instanceEqual } from "./utilities.js";
import keywordSchema from "./enum.schema.json" with { type: "json" };

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `enum`
 *
 * @type Keyword<Json[]>
 */
export default {
  uri: "https://json-schema.org/keyword/enum",
  shape: "data",
  schema: keywordSchema,
  evaluate(values, { instance }) {
    // Primitives are compared with a lookup. Only arrays and objects need
    // instanceEqual.
    /** @type Set<Json> */
    const primitives = new Set();
    /** @type Json[] */
    const structured = [];
    for (const value of values) {
      if (typeof value === "object" && value !== null) {
        structured.push(value);
      } else {
        primitives.add(value);
      }
    }

    return (node) => {
      const type = instance.typeOf(node);
      if (type === undefined) {
        return true;
      } else if (type !== "array" && type !== "object") {
        return primitives.has(instance.value(node));
      }

      for (const value of structured) {
        if (instanceEqual(instance, node, jsInstance, value, true)) {
          return true;
        }
      }

      return false;
    };
  }
};

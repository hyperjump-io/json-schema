import { jsInstance } from "../instance.js";
import { instanceEqual } from "./utilities.js";

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
  valueSchema: new URL("./enum.schema.json", import.meta.url).href,
  evaluate: (values, { instance }) => (node) => {
    for (const value of values) {
      if (instanceEqual(instance, node, jsInstance, value, true)) {
        return true;
      }
    }

    return false;
  }
};

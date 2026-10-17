import { jsInstance } from "../instance.js";
import { instanceEqual } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `const`
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/const",
  shape: "data",
  valueSchema: new URL("./const.schema.json", import.meta.url).href,
  evaluate: (value, { instance }) => (node) => instanceEqual(instance, node, jsInstance, value, true)
};

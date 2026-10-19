import { number } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minimum`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minimum",
  shape: "data",
  check: number,
  evaluate: (minimum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) >= minimum;
  }
};

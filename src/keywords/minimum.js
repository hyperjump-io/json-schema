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
  evaluate: (minimum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) >= minimum;
  }
};

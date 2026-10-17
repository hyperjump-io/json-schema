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
  valueSchema: new URL("./minimum.schema.json", import.meta.url).href,
  evaluate: (minimum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) >= minimum;
  }
};

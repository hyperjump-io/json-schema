/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maximum`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maximum",
  shape: "data",
  valueSchema: new URL("./maximum.schema.json", import.meta.url).href,
  evaluate: (maximum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) <= maximum;
  }
};

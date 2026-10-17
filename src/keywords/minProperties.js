/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/minProperties",
  shape: "data",
  valueSchema: new URL("./minProperties.schema.json", import.meta.url).href,
  evaluate: (minProperties, { instance }) => (node) => {
    return instance.typeOf(node) !== "object" || instance.length(node) >= minProperties;
  }
};

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `maxProperties`
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/maxProperties",
  shape: "data",
  evaluate: (maxProperties, { instance }) => (node) => {
    return instance.typeOf(node) !== "object" || instance.length(node) <= maxProperties;
  }
};

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
  lower: (value) => ({ op: "equals", value })
};

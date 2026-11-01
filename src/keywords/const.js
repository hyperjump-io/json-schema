/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `const`
 *
 * @type Keyword<Json, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/const",
  shape: "data",
  lower: (value) => ({ op: "equals", value })
};

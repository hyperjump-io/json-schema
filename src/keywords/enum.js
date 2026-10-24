import { array } from "./checks.js";

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
  check: array,
  lower: (values) => ({ op: "oneOfValues", values })
};

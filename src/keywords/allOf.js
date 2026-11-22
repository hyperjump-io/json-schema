import { all } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `allOf`
 *
 * @type Keyword<Expression[], { array: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/allOf",
  shape: { array: "schema" },
  lower: (schemas) => all(schemas)
};

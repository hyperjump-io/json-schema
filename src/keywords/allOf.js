import { all } from "./utilities.js";
import { nonEmpty } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `allOf`
 *
 * @type Keyword<Expression[]>
 */
export default {
  uri: "https://json-schema.org/keyword/allOf",
  shape: { array: "schema" },
  check: nonEmpty,
  lower: (schemas) => all(schemas)
};

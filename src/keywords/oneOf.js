import { nonEmpty } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `oneOf`
 *
 * @type Keyword<Expression[], { array: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/oneOf",
  shape: { array: "schema" },
  check: nonEmpty,
  lower: (schemas) => ({ op: "one", of: schemas })
};

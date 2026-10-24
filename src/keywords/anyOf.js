import { nonEmpty } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `anyOf`
 *
 * @type Keyword<Expression[]>
 */
export default {
  uri: "https://json-schema.org/keyword/anyOf",
  shape: { array: "schema" },
  check: nonEmpty,
  lower: (schemas) => ({ op: "any", of: schemas })
};

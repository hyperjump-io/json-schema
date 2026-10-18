import keywordSchema from "./multipleOf.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `multipleOf`. Floating point division is inexact, so a remainder that's
 * close enough to zero, or to `multipleOf`, counts as none.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/multipleOf",
  shape: "data",
  schema: keywordSchema,
  evaluate: (multipleOf, { instance }) => (node) => {
    if (instance.typeOf(node) !== "number") {
      return true;
    }

    const remainder = /** @type number */ (instance.value(node)) % multipleOf;
    return isClose(remainder, 0) || isClose(remainder, multipleOf);
  }
};

/** @type (a: number, b: number) => boolean */
const isClose = (a, b) => Math.abs(a - b) < 1.19209290e-7;

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` since draft-06. It's a number, not a boolean.
 *
 * @type Keyword<number>
 */
export default {
  uri: "https://json-schema.org/keyword/exclusiveMaximum",
  shape: "data",
  evaluate: (exclusiveMaximum, { instance }) => (node) => {
    return instance.typeOf(node) !== "number" || /** @type number */ (instance.value(node)) < exclusiveMaximum;
  }
};

import { uniqueStrings } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `required` since draft-04. A property whose value couldn't be parsed is
 * present.
 *
 * @type Keyword<string[]>
 */
export default {
  uri: "https://json-schema.org/keyword/required",
  shape: "data",
  default: [],
  check: uniqueStrings,
  evaluate: (required, { instance }) => (node) => {
    if (instance.typeOf(node) !== "object") {
      return true;
    }

    for (const name of required) {
      if (!instance.has(node, name)) {
        return false;
      }
    }

    return true;
  }
};

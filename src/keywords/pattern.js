import { regex } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `pattern`. It's an ECMA-262 regular expression with the `u` flag. It isn't
 * anchored.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/pattern",
  shape: "data",
  check: regex,
  evaluate(pattern, { instance }) {
    const regExp = new RegExp(pattern, "u");
    return (node) => instance.typeOf(node) !== "string" || regExp.test(/** @type string */ (instance.value(node)));
  }
};

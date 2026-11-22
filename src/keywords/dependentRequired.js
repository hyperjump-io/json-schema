import { all, hasProperty, whenProperty } from "./utilities.js";
import { mapOf, strings } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `dependentRequired`
 *
 * @type Keyword<Record<string, string[]>, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/dependentRequired",
  shape: "data",
  check: mapOf(strings),
  lower: (dependentRequired) => all(Object.entries(dependentRequired).map(([name, required]) => {
    return whenProperty(hasProperty(name), all(required.map(hasProperty)));
  }))
};

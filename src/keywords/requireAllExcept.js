import { all, hasProperty } from "./utilities.js";
import { strings } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `requireAllExcept`. Every property in the sibling `properties` is required
 * except the ones it lists. It compiles to the names that are required.
 *
 * @type Keyword<string[], "data", { properties?: [string, Expression][] }>
 */
export default {
  uri: "https://json-schema.org/keyword/requireAllExcept",
  siblings: { properties: "https://json-schema.org/keyword/properties" },
  shape: "data",
  check: strings,
  lower: (except, { properties = [] }) => all(properties
    .filter(([name]) => !except.includes(name))
    .map(([name]) => hasProperty(name)))
};

import { all, hasProperty, whenProperty } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `dependentSchemas`. Each schema applies to the whole instance if it has
 * the property.
 *
 * @type Keyword<[string, Expression][]>
 */
export default {
  uri: "https://json-schema.org/keyword/dependentSchemas",
  shape: { map: "schema" },
  default: {},
  lower: (pairs) => all(pairs.map(([name, schema]) => whenProperty(hasProperty(name), schema)))
};

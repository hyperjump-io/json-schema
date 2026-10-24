import { all, whenProperty } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `propertyDependencies`. If the instance has the property and its value is
 * a string with a schema, the schema applies to the whole instance.
 *
 * @type Keyword<[string, [string, Expression][]][]>
 */
export default {
  uri: "https://json-schema.org/keyword/propertyDependencies",
  shape: { map: { map: "schema" } },
  lower: (pairs) => all(pairs.flatMap(([name, mappings]) => mappings.map(([value, schema]) => {
    return whenProperty({ op: "propertyEquals", name, value }, schema);
  })))
};
